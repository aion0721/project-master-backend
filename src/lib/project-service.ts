import { getStore, updateStore, type StoreData } from './file-store.js'
import type {
  CreateProjectInput,
  Member,
  Phase,
  Project,
  ProjectStructureAssignmentInput,
  ProjectAssignment,
  UpdatePhaseInput,
  UpdateProjectLinkInput,
  UpdateProjectPhasesInput,
  UpdateProjectScheduleInput,
  UpdateProjectStructureInput,
  WorkStatus,
} from '../types/domain.js'

const phaseTemplates = [
  { name: '基礎検討', startWeek: 1, endWeek: 2 },
  { name: '基本設計', startWeek: 3, endWeek: 5 },
  { name: '詳細設計', startWeek: 6, endWeek: 8 },
  { name: 'テスト', startWeek: 9, endWeek: 11 },
  { name: '移行', startWeek: 12, endWeek: 13 },
] as const

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`)
}

function addDays(value: string, days: number) {
  const next = parseDate(value)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

function addWeeks(value: string, weeks: number) {
  return addDays(value, weeks * 7)
}

function normalizeProjectLink(projectLink: string | null | undefined) {
  const normalized = projectLink?.trim()
  return normalized ? normalized : null
}

function getMemberById(memberId: string, members: Member[]) {
  return members.find((member) => member.id === memberId)
}

function getProjectPhases(projectId: string, phases: Phase[]) {
  return phases.filter((phase) => phase.projectId === projectId)
}

function getCurrentPhase(projectPhases: Phase[]) {
  return (
    projectPhases.find((phase) => phase.status === '進行中' || phase.status === '遅延') ??
    projectPhases.find((phase) => phase.status === '未着手') ??
    projectPhases.at(-1)
  )
}

function getProjectPm(project: Project, members: Member[]) {
  return getMemberById(project.pmMemberId, members)
}

function getPhaseRange(project: Project, phase: Phase) {
  return {
    startDate: addWeeks(project.startDate, phase.startWeek - 1),
    endDate: addDays(addWeeks(project.startDate, phase.endWeek), -1),
  }
}

function getActivePhasesForDate(project: Project, projectPhases: Phase[], slotDate: string) {
  const slotTime = parseDate(slotDate).getTime()

  return projectPhases.filter((phase) => {
    const range = getPhaseRange(project, phase)
    const startTime = parseDate(range.startDate).getTime()
    const endTime = parseDate(range.endDate).getTime()

    return slotTime >= startTime && slotTime <= endTime
  })
}

function getGlobalWeekSlots(projects: Project[]) {
  const orderedProjects = [...projects].sort(
    (left, right) => parseDate(left.startDate).getTime() - parseDate(right.startDate).getTime(),
  )
  const firstProject = orderedProjects[0]
  const lastProject = orderedProjects.at(-1)

  if (!firstProject || !lastProject) {
    return []
  }

  const totalWeeks =
    Math.ceil(
      (parseDate(lastProject.endDate).getTime() - parseDate(firstProject.startDate).getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    ) + 1

  return Array.from({ length: totalWeeks }, (_, index) => {
    const startDate = addWeeks(firstProject.startDate, index)

    return {
      index: index + 1,
      label: `GW${index + 1}`,
      startDate,
    }
  })
}

function enrichMember(member: Member | undefined, members: Member[]) {
  if (!member) {
    return null
  }

  const manager = member.managerId ? getMemberById(member.managerId, members) : undefined

  return {
    ...member,
    managerName: manager?.name ?? null,
  }
}

function deriveProjectStatus(projectPhases: Phase[]): WorkStatus {
  if (projectPhases.some((phase) => phase.status === '遅延')) {
    return '遅延'
  }

  if (projectPhases.every((phase) => phase.status === '完了')) {
    return '完了'
  }

  if (projectPhases.some((phase) => phase.status === '進行中' || phase.status === '完了')) {
    return '進行中'
  }

  return '未着手'
}

function buildProjectDetailFromStore(projectId: string, store: StoreData) {
  const project = store.projects.find((item) => item.projectNumber === projectId)

  if (!project) {
    return null
  }

  const projectPhases = getProjectPhases(project.projectNumber, store.phases)
  const projectAssignments = store.assignments.filter(
    (assignment) => assignment.projectId === project.projectNumber,
  )
  const relevantMemberIds = new Set([
    project.pmMemberId,
    ...projectAssignments.map((item) => item.memberId),
  ])

  return {
    project: {
      ...project,
      pm: enrichMember(getProjectPm(project, store.members), store.members),
    },
    phases: projectPhases.map((phase) => ({
      ...phase,
      range: getPhaseRange(project, phase),
    })),
    assignments: projectAssignments.map((assignment) => ({
      ...assignment,
      member: enrichMember(getMemberById(assignment.memberId, store.members), store.members),
    })),
    members: store.members
      .filter((member) => relevantMemberIds.has(member.id))
      .map((member) => enrichMember(member, store.members)),
  }
}

function createAssignmentIdGenerator(projectId: string, assignments: ProjectAssignment[]) {
  let nextSuffix =
    assignments
      .filter((assignment) => assignment.projectId === projectId)
      .map((assignment) => Number(assignment.id.split('-').at(-1)))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0) + 1

  return () => {
    const nextId = `as-${projectId}-${nextSuffix}`
    nextSuffix += 1
    return nextId
  }
}

function createPhaseIdGenerator(projectId: string, phases: Phase[]) {
  let nextSuffix =
    phases
      .filter((phase) => phase.projectId === projectId)
      .map((phase) => Number(phase.id.split('-').at(-1)))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0) + 1

  return () => {
    const nextId = `ph-${projectId}-${nextSuffix}`
    nextSuffix += 1
    return nextId
  }
}

function normalizeStructureAssignments(
  projectId: string,
  inputAssignments: ProjectStructureAssignmentInput[],
  existingAssignments: ProjectAssignment[],
  pmMemberId: string,
) {
  const nextAssignmentId = createAssignmentIdGenerator(projectId, existingAssignments)
  const existingPmAssignment = existingAssignments.find((assignment) => assignment.responsibility === 'PM')

  return [
    {
      id: existingPmAssignment?.id ?? nextAssignmentId(),
      projectId,
      memberId: pmMemberId,
      responsibility: 'PM',
    },
    ...inputAssignments.map((assignment) => ({
      id: assignment.id ?? nextAssignmentId(),
      projectId,
      memberId: assignment.memberId,
      responsibility: assignment.responsibility,
    })),
  ]
}

function syncProjectStatus(projectId: string, store: StoreData) {
  const project = store.projects.find((item) => item.projectNumber === projectId)

  if (!project) {
    throw new Error('Project not found')
  }

  project.status = deriveProjectStatus(getProjectPhases(project.projectNumber, store.phases))
  return project
}

export async function listMembers() {
  const store = await getStore()
  return store.members.map((member) => enrichMember(member, store.members))
}

export async function listProjects() {
  const store = await getStore()

  return store.projects.map((project) => {
    const projectPhases = getProjectPhases(project.projectNumber, store.phases)
    const currentPhase = getCurrentPhase(projectPhases)
    const pm = getProjectPm(project, store.members)

    return {
      ...project,
      currentPhase: currentPhase?.name ?? null,
      pm: enrichMember(pm, store.members),
    }
  })
}

export async function getProjectDetail(projectId: string) {
  const store = await getStore()
  return buildProjectDetailFromStore(projectId, store)
}

export async function createProject(input: CreateProjectInput) {
  return updateStore(['projects', 'phases', 'assignments'], (store) => {
    const pm = getMemberById(input.pmMemberId, store.members)

    if (!pm) {
      throw new Error('PM member does not exist')
    }

    if (store.projects.some((project) => project.projectNumber === input.projectNumber)) {
      throw new Error('Project number already exists')
    }

    const projectId = input.projectNumber
    const project: Project = {
      projectNumber: projectId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status,
      pmMemberId: input.pmMemberId,
      projectLink: normalizeProjectLink(input.projectLink),
    }

    store.projects.push(project)
    store.assignments.push({
      id: `as-${projectId}-1`,
      projectId,
      memberId: input.pmMemberId,
      responsibility: 'PM',
    })

    phaseTemplates.forEach((template, index) => {
      store.phases.push({
        id: `ph-${projectId}-${index + 1}`,
        projectId,
        name: template.name,
        startWeek: template.startWeek,
        endWeek: template.endWeek,
        status: '未着手',
        progress: 0,
        assigneeMemberId: input.pmMemberId,
      })
    })

    return buildProjectDetailFromStore(projectId, store)
  })
}

export async function updatePhase(phaseId: string, input: UpdatePhaseInput) {
  return updateStore(['phases', 'projects'], (store) => {
    const phase = store.phases.find((item) => item.id === phaseId)

    if (!phase) {
      throw new Error('Phase not found')
    }

    if (input.startWeek < 1) {
      throw new Error('startWeek must be greater than or equal to 1')
    }

    if (input.endWeek < input.startWeek) {
      throw new Error('endWeek must be greater than or equal to startWeek')
    }

    if (input.progress < 0 || input.progress > 100) {
      throw new Error('progress must be between 0 and 100')
    }

    phase.startWeek = input.startWeek
    phase.endWeek = input.endWeek
    phase.status = input.status
    phase.progress = input.progress

    const project = syncProjectStatus(phase.projectId, store)

    return {
      phase: { ...phase },
      project: { ...project },
    }
  })
}

export async function updateProjectCurrentPhase(projectId: string, phaseId: string) {
  return updateStore(['phases', 'projects'], (store) => {
    const project = store.projects.find((item) => item.projectNumber === projectId)

    if (!project) {
      throw new Error('Project not found')
    }

    const projectPhases = getProjectPhases(projectId, store.phases)
    const targetIndex = projectPhases.findIndex((phase) => phase.id === phaseId)

    if (targetIndex < 0) {
      throw new Error('Phase not found in project')
    }

    projectPhases.forEach((phase, index) => {
      if (index < targetIndex) {
        phase.status = '完了'
        phase.progress = 100
        return
      }

      if (index === targetIndex) {
        phase.status = '進行中'
        phase.progress = phase.progress >= 100 ? 80 : phase.progress
        return
      }

      phase.status = '未着手'
      phase.progress = 0
    })

    syncProjectStatus(projectId, store)
    return buildProjectDetailFromStore(projectId, store)
  })
}

export async function updateProjectSchedule(projectId: string, input: UpdateProjectScheduleInput) {
  return updateStore(['projects'], (store) => {
    const project = store.projects.find((item) => item.projectNumber === projectId)

    if (!project) {
      throw new Error('Project not found')
    }

    if (input.startDate > input.endDate) {
      throw new Error('endDate must be greater than or equal to startDate')
    }

    project.startDate = input.startDate
    project.endDate = input.endDate

    return buildProjectDetailFromStore(projectId, store)
  })
}

export async function updateProjectLink(projectId: string, input: UpdateProjectLinkInput) {
  return updateStore(['projects'], (store) => {
    const project = store.projects.find((item) => item.projectNumber === projectId)

    if (!project) {
      throw new Error('Project not found')
    }

    project.projectLink = normalizeProjectLink(input.projectLink)

    return buildProjectDetailFromStore(projectId, store)
  })
}

export async function updateProjectPhases(projectId: string, input: UpdateProjectPhasesInput) {
  return updateStore(['projects', 'phases'], (store) => {
    const project = store.projects.find((item) => item.projectNumber === projectId)

    if (!project) {
      throw new Error('Project not found')
    }

    if (input.phases.length === 0) {
      throw new Error('At least one phase is required')
    }

    for (const phase of input.phases) {
      if (!phase.name.trim()) {
        throw new Error('phase name is required')
      }

      if (phase.startWeek < 1 || phase.endWeek < phase.startWeek) {
        throw new Error('phase weeks are invalid')
      }

      if (phase.progress < 0 || phase.progress > 100) {
        throw new Error('phase progress must be between 0 and 100')
      }
    }

    const nextPhaseId = createPhaseIdGenerator(projectId, store.phases)
    const nextPhases = input.phases.map((phase) => ({
      id: phase.id ?? nextPhaseId(),
      projectId,
      name: phase.name.trim(),
      startWeek: phase.startWeek,
      endWeek: phase.endWeek,
      status: phase.status,
      progress: phase.progress,
      assigneeMemberId: project.pmMemberId,
    }))

    store.phases = store.phases.filter((phase) => phase.projectId !== projectId).concat(nextPhases)
    syncProjectStatus(projectId, store)

    return buildProjectDetailFromStore(projectId, store)
  })
}

export async function updateProjectStructure(projectId: string, input: UpdateProjectStructureInput) {
  return updateStore(['projects', 'assignments'], (store) => {
    const project = store.projects.find((item) => item.projectNumber === projectId)

    if (!project) {
      throw new Error('Project not found')
    }

    if (!getMemberById(input.pmMemberId, store.members)) {
      throw new Error('PM member does not exist')
    }

    for (const assignment of input.assignments) {
      if (!assignment.responsibility.trim()) {
        throw new Error('responsibility is required')
      }

      if (!getMemberById(assignment.memberId, store.members)) {
        throw new Error('Assigned member does not exist')
      }
    }

    project.pmMemberId = input.pmMemberId

    const currentProjectAssignments = store.assignments.filter(
      (assignment) => assignment.projectId === projectId,
    )
    const nextAssignments = normalizeStructureAssignments(
      projectId,
      input.assignments.map((assignment) => ({
        ...assignment,
        responsibility: assignment.responsibility.trim(),
      })),
      currentProjectAssignments,
      input.pmMemberId,
    )

    store.assignments = store.assignments
      .filter((assignment) => assignment.projectId !== projectId)
      .concat(nextAssignments)

    return buildProjectDetailFromStore(projectId, store)
  })
}

export async function getCrossProjectWeeks() {
  const store = await getStore()
  const weekSlots = getGlobalWeekSlots(store.projects)

  return {
    weeks: weekSlots,
    projects: store.projects.map((project) => {
      const projectPhases = getProjectPhases(project.projectNumber, store.phases)
      const pm = getProjectPm(project, store.members)

      return {
        projectNumber: project.projectNumber,
        name: project.name,
        status: project.status,
        pm: enrichMember(pm, store.members),
        weeklyPhases: weekSlots.map((slot) => ({
          weekIndex: slot.index,
          startDate: slot.startDate,
          phases: getActivePhasesForDate(project, projectPhases, slot.startDate).map((phase) => ({
            id: phase.id,
            name: phase.name,
            status: phase.status,
            progress: phase.progress,
          })),
        })),
      }
    }),
  }
}
