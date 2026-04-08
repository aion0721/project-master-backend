export type WorkStatus = '未着手' | '進行中' | '完了' | '遅延'
export type ProjectStatus = WorkStatus | '中止'
export type ProjectStatusOverride = ProjectStatus

export interface ProjectLink {
  label: string
  url: string
}

export interface Project {
  projectNumber: string
  name: string
  startDate: string
  endDate: string
  status: ProjectStatus
  statusOverride?: ProjectStatusOverride | null
  pmMemberId: string
  note?: string | null
  hasReportItems?: boolean
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
  defaultProjectStatusFilters?: ProjectStatus[]
}

export interface ProjectAssignment {
  id: string
  projectId: string
  memberId: string
  responsibility: string
  reportsToMemberId?: string | null
}

export interface SystemAssignment {
  id: string
  systemId: string
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
  systemLinks?: ProjectLink[]
}

export interface SystemRelation {
  id: string
  sourceSystemId: string
  targetSystemId: string
  protocol?: string | null
  note?: string | null
}

export interface CreateProjectInput {
  projectNumber: string
  name: string
  startDate: string
  endDate: string
  status: WorkStatus
  pmMemberId: string
  note?: string | null
  hasReportItems?: boolean
  initialPhaseNames?: string[]
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

export interface UpdateProjectNoteInput {
  note?: string | null
}

export interface UpdateProjectReportStatusInput {
  hasReportItems: boolean
}

export interface UpdateProjectStatusOverrideInput {
  statusOverride?: ProjectStatusOverride | null
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

export interface SystemStructureAssignmentInput {
  id?: string
  memberId: string
  responsibility: string
  reportsToMemberId?: string | null
}

export interface UpdateSystemStructureInput {
  ownerMemberId: string
  assignments: SystemStructureAssignmentInput[]
}

export interface CreateSystemInput {
  id: string
  name: string
  category: string
  ownerMemberId?: string | null
  note?: string | null
  systemLinks?: ProjectLink[]
}

export interface CreateSystemRelationInput {
  sourceSystemId: string
  targetSystemId: string
  protocol?: string | null
  note?: string | null
}

export interface UpdateSystemInput {
  name: string
  category: string
  ownerMemberId?: string | null
  note?: string | null
  systemLinks?: ProjectLink[]
}
