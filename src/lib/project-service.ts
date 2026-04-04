import { assignments, members, phases, projects } from '../data/mockData.js'
import type { Member, Phase, Project } from '../types/domain.js'

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

function getMemberById(memberId: string) {
  return members.find((member) => member.id === memberId)
}

function getProjectPhases(projectId: string) {
  return phases
    .filter((phase) => phase.projectId === projectId)
    .sort((left, right) => left.startWeek - right.startWeek)
}

function getProjectAssignments(projectId: string) {
  return assignments.filter((assignment) => assignment.projectId === projectId)
}

function getCurrentPhase(projectPhases: Phase[]) {
  return (
    projectPhases.find((phase) => phase.status === '進行中' || phase.status === '遅延') ??
    projectPhases.find((phase) => phase.status === '未着手') ??
    projectPhases.at(-1)
  )
}

function getProjectPm(project: Project) {
  return getMemberById(project.pmMemberId)
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

function getGlobalWeekSlots() {
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

function enrichMember(member: Member | undefined) {
  if (!member) {
    return null
  }

  const manager = member.managerId ? getMemberById(member.managerId) : undefined

  return {
    ...member,
    managerName: manager?.name ?? null,
  }
}

export function listProjects() {
  return projects.map((project) => {
    const projectPhases = getProjectPhases(project.id)
    const currentPhase = getCurrentPhase(projectPhases)
    const pm = getProjectPm(project)

    return {
      ...project,
      currentPhase: currentPhase?.name ?? null,
      pm: enrichMember(pm),
    }
  })
}

export function getProjectDetail(projectId: string) {
  const project = projects.find((item) => item.id === projectId)

  if (!project) {
    return null
  }

  const projectPhases = getProjectPhases(project.id)
  const projectAssignments = getProjectAssignments(project.id)
  const relevantMemberIds = new Set(
    [project.pmMemberId, ...projectPhases.map((phase) => phase.assigneeMemberId), ...projectAssignments.map((item) => item.memberId)],
  )

  return {
    project: {
      ...project,
      pm: enrichMember(getProjectPm(project)),
    },
    phases: projectPhases.map((phase) => ({
      ...phase,
      assignee: enrichMember(getMemberById(phase.assigneeMemberId)),
      range: getPhaseRange(project, phase),
    })),
    assignments: projectAssignments.map((assignment) => ({
      ...assignment,
      member: enrichMember(getMemberById(assignment.memberId)),
    })),
    members: members
      .filter((member) => relevantMemberIds.has(member.id))
      .map((member) => enrichMember(member)),
  }
}

export function getCrossProjectWeeks() {
  const weekSlots = getGlobalWeekSlots()

  return {
    weeks: weekSlots,
    projects: projects.map((project) => {
      const projectPhases = getProjectPhases(project.id)
      const pm = getProjectPm(project)

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        pm: enrichMember(pm),
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
