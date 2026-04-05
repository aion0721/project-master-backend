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
  relatedSystemIds?: string[]
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

export interface ProjectEvent {
  id: string
  projectId: string
  name: string
  week: number
  status: WorkStatus
  ownerMemberId?: string | null
  note?: string | null
}

export interface Member {
  id: string
  name: string
  departmentCode: string
  departmentName: string
  role: string
  managerId: string | null
  bookmarkedProjectIds: string[]
  defaultProjectStatusFilters?: WorkStatus[]
}

export interface ProjectAssignment {
  id: string
  projectId: string
  memberId: string
  responsibility: string
  reportsToMemberId?: string | null
}

export interface ManagedSystem {
  id: string
  name: string
  category: string
  ownerMemberId?: string | null
  note?: string | null
}

export interface SystemRelation {
  id: string
  sourceSystemId: string
  targetSystemId: string
  note?: string | null
}

export interface CreateProjectInput {
  projectNumber: string
  name: string
  startDate: string
  endDate: string
  status: WorkStatus
  pmMemberId: string
  relatedSystemIds?: string[]
  projectLinks: ProjectLink[]
}

export interface CreateMemberInput {
  id: string
  name: string
  departmentCode: string
  departmentName: string
  role: string
  managerId: string | null
}

export interface UpdateMemberInput {
  name: string
  departmentCode: string
  departmentName: string
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

export interface UpdateProjectSystemsInput {
  relatedSystemIds: string[]
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

export interface UpdateProjectEventsInput {
  events: Array<{
    id?: string
    name: string
    week: number
    status: WorkStatus
    ownerMemberId?: string | null
    note?: string | null
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

export interface CreateSystemInput {
  id: string
  name: string
  category: string
  ownerMemberId?: string | null
  note?: string | null
}

export interface CreateSystemRelationInput {
  sourceSystemId: string
  targetSystemId: string
  note?: string | null
}

export interface UpdateSystemInput {
  name: string
  category: string
  ownerMemberId?: string | null
  note?: string | null
}
