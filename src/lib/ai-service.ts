import type {
  CreateProjectInput,
  ProjectStatus,
  UpdateProjectPhasesInput,
  WorkStatus,
} from '../types/domain.js'
import { appendAiAuditEntry, listAiAuditEntries, type AiAuditActorType } from './ai-audit-store.js'
import {
  createProject,
  getCrossProjectWeeks,
  getProjectDetail,
  listMembers,
  listSystems,
  updateProjectPhases,
} from './project-service.js'

const statusCodeMap: Record<ProjectStatus, string> = {
  未着手: 'not_started',
  進行中: 'in_progress',
  完了: 'completed',
  遅延: 'delayed',
  中止: 'cancelled',
}

function toStatusCode(status: ProjectStatus) {
  return statusCodeMap[status]
}

function toWorkStatusCode(status: WorkStatus) {
  return statusCodeMap[status]
}

function enrichProjectForAi<T extends { status: ProjectStatus }>(item: T) {
  return {
    ...item,
    statusCode: toStatusCode(item.status),
  }
}

export interface AiCommandActor {
  type: AiAuditActorType
  id?: string | null
}

export interface ExecuteAiCreateProjectCommand {
  type: 'create_project'
  payload: CreateProjectInput
}

export interface ExecuteAiUpdateProjectPhasesCommand {
  type: 'update_project_phases'
  projectNumber: string
  payload: UpdateProjectPhasesInput
}

export type ExecuteAiCommand =
  | ExecuteAiCreateProjectCommand
  | ExecuteAiUpdateProjectPhasesCommand

export async function getAiHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    capabilitiesVersion: 'v1',
  }
}

export async function getAiCapabilities() {
  return {
    version: 'v1',
    supportedReadModels: [
      {
        name: 'project_context',
        path: '/api/ai/projects/:projectNumber/context',
      },
      {
        name: 'audit_log',
        path: '/api/ai/audit-log',
      },
    ],
    supportedCommands: [
      {
        type: 'create_project',
        dryRunSupported: true,
        executionPath: '/api/ai/commands/execute',
      },
      {
        type: 'update_project_phases',
        dryRunSupported: true,
        executionPath: '/api/ai/commands/execute',
      },
    ],
    notes: [
      'Existing /api routes remain unchanged.',
      'AI commands reuse existing service-layer business logic.',
      'Every AI command execution is appended to data/ai-audit-log.json.',
    ],
  }
}

export async function getAiProjectContext(projectNumber: string) {
  const [detail, systems, crossProject] = await Promise.all([
    getProjectDetail(projectNumber),
    listSystems(),
    getCrossProjectWeeks(),
  ])

  if (!detail) {
    return null
  }

  const relatedSystemIds = new Set(detail.project.relatedSystemIds ?? [])
  const relatedSystems = systems.filter((system) => relatedSystemIds.has(system.id))
  const crossProjectProject = crossProject.projects.find((project) => project.projectNumber === projectNumber)
  const delayedProjects = crossProject.projects.filter((project) => project.status === '遅延').map((project) => ({
    projectNumber: project.projectNumber,
    name: project.name,
    status: project.status,
    statusCode: toStatusCode(project.status),
  }))

  return {
    generatedAt: new Date().toISOString(),
    project: enrichProjectForAi(detail.project),
    phases: detail.phases.map((phase, index) => ({
      ...phase,
      order: index + 1,
      statusCode: toWorkStatusCode(phase.status),
    })),
    events: detail.events.map((event) => ({
      ...event,
      statusCode: toWorkStatusCode(event.status),
    })),
    assignments: detail.assignments,
    projectDepartments: detail.projectDepartments,
    members: detail.members,
    relatedSystems,
    crossProject: {
      totalProjects: crossProject.projects.length,
      delayedProjects,
      weeklyPhases: crossProjectProject?.weeklyPhases ?? [],
    },
    supportedCommands: ['create_project', 'update_project_phases'],
  }
}

async function validateCreateProjectCommand(payload: CreateProjectInput) {
  const [members, systems, existingProject] = await Promise.all([
    listMembers(),
    listSystems(),
    getProjectDetail(payload.projectNumber),
  ])

  if (existingProject) {
    throw new Error('Project number already exists')
  }

  if (!members.some((member) => member?.id === payload.pmMemberId)) {
    throw new Error('PM member does not exist')
  }

  const validSystemIds = new Set(systems.map((system) => system.id))

  if ((payload.relatedSystemIds ?? []).some((systemId) => !validSystemIds.has(systemId))) {
    throw new Error('Related system does not exist')
  }
}

async function validateUpdateProjectPhasesCommand(
  projectNumber: string,
  payload: UpdateProjectPhasesInput,
) {
  const detail = await getProjectDetail(projectNumber)

  if (!detail) {
    throw new Error('Project not found')
  }

  if (payload.phases.length === 0) {
    throw new Error('At least one phase is required')
  }
}

function getCommandAuditFields(command: ExecuteAiCommand) {
  if (command.type === 'create_project') {
    return {
      commandType: command.type,
      targetType: 'project',
      targetId: command.payload.projectNumber,
      input: command.payload,
    }
  }

  return {
    commandType: command.type,
    targetType: 'project_phases',
    targetId: command.projectNumber,
    input: {
      projectNumber: command.projectNumber,
      ...command.payload,
    },
  }
}

export async function executeAiCommand(
  command: ExecuteAiCommand,
  actor: AiCommandActor,
  dryRun = false,
) {
  const auditFields = getCommandAuditFields(command)

  try {
    if (command.type === 'create_project') {
      await validateCreateProjectCommand(command.payload)

      if (dryRun) {
        const preview = {
          validated: true,
          commandType: command.type,
          targetId: command.payload.projectNumber,
          wouldInvoke: 'createProject',
        }

        const auditEntry = await appendAiAuditEntry({
          actorType: actor.type,
          actorId: actor.id ?? null,
          commandType: auditFields.commandType,
          targetType: auditFields.targetType,
          targetId: auditFields.targetId,
          dryRun: true,
          status: 'validated',
          input: auditFields.input,
          result: preview,
          errorMessage: null,
        })

        return {
          dryRun: true,
          auditEntry,
          result: preview,
        }
      }

      const result = await createProject(command.payload)
      const auditEntry = await appendAiAuditEntry({
        actorType: actor.type,
        actorId: actor.id ?? null,
        commandType: auditFields.commandType,
        targetType: auditFields.targetType,
        targetId: auditFields.targetId,
        dryRun: false,
        status: 'executed',
        input: auditFields.input,
        result,
        errorMessage: null,
      })

      return {
        dryRun: false,
        auditEntry,
        result,
      }
    }

    await validateUpdateProjectPhasesCommand(command.projectNumber, command.payload)

    if (dryRun) {
      const preview = {
        validated: true,
        commandType: command.type,
        targetId: command.projectNumber,
        wouldInvoke: 'updateProjectPhases',
      }

      const auditEntry = await appendAiAuditEntry({
        actorType: actor.type,
        actorId: actor.id ?? null,
        commandType: auditFields.commandType,
        targetType: auditFields.targetType,
        targetId: auditFields.targetId,
        dryRun: true,
        status: 'validated',
        input: auditFields.input,
        result: preview,
        errorMessage: null,
      })

      return {
        dryRun: true,
        auditEntry,
        result: preview,
      }
    }

    const result = await updateProjectPhases(command.projectNumber, command.payload)
    const auditEntry = await appendAiAuditEntry({
      actorType: actor.type,
      actorId: actor.id ?? null,
      commandType: auditFields.commandType,
      targetType: auditFields.targetType,
      targetId: auditFields.targetId,
      dryRun: false,
      status: 'executed',
      input: auditFields.input,
      result,
      errorMessage: null,
    })

    return {
      dryRun: false,
      auditEntry,
      result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to execute AI command'

    const auditEntry = await appendAiAuditEntry({
      actorType: actor.type,
      actorId: actor.id ?? null,
      commandType: auditFields.commandType,
      targetType: auditFields.targetType,
      targetId: auditFields.targetId,
      dryRun,
      status: 'failed',
      input: auditFields.input,
      errorMessage: message,
    })

    throw Object.assign(new Error(message), { auditEntry })
  }
}

export async function getAiAuditLog(limit?: number) {
  return listAiAuditEntries(limit)
}
