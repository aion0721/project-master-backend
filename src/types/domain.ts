export type WorkStatus = '未着手' | '進行中' | '完了' | '遅延'

export interface ProjectLink {
  label: string
  url: string
}

export interface Project {
  projectNumber: string
  name: string
  startDate: string
  endDate: string
  status: WorkStatus
  pmMemberId: string
  projectLinks: ProjectLink[]
}

export interface Phase {
  id: string
  projectId: string
  name: string
  startWeek: number
  endWeek: number
  status: WorkStatus
  progress: number
  assigneeMemberId: string
}

export interface Member {
  id: string
  name: string
  role: string
  managerId: string | null
}

export interface ProjectAssignment {
  id: string
  projectId: string
  memberId: string
  responsibility: string
  reportsToMemberId?: string | null
}

export interface UserProfile {
  id: string
  username: string
  bookmarkedProjectIds: string[]
}

export interface CreateProjectInput {
  projectNumber: string
  name: string
  startDate: string
  endDate: string
  status: WorkStatus
  pmMemberId: string
  projectLinks: ProjectLink[]
}

export interface CreateMemberInput {
  id: string
  name: string
  role: string
  managerId: string | null
}

export interface UpdateMemberInput {
  name: string
  role: string
  managerId: string | null
}

export interface UpdateProjectScheduleInput {
  startDate: string
  endDate: string
}

export interface UpdateProjectLinksInput {
  projectLinks: ProjectLink[]
}

export interface UpdateProjectPhasesInput {
  phases: Array<{
    id?: string
    name: string
    startWeek: number
    endWeek: number
    status: WorkStatus
    progress: number
  }>
}

export interface UpdatePhaseInput {
  startWeek: number
  endWeek: number
  status: WorkStatus
  progress: number
}

export interface ProjectStructureAssignmentInput {
  id?: string
  memberId: string
  responsibility: string
  reportsToMemberId?: string | null
}

export interface UpdateProjectStructureInput {
  pmMemberId: string
  assignments: ProjectStructureAssignmentInput[]
}
