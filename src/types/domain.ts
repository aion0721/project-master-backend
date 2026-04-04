export type WorkStatus = '未着手' | '進行中' | '完了' | '遅延'

export type PhaseName = '基礎検討' | '基本設計' | '詳細設計' | 'テスト' | '移行'

export interface Project {
  id: string
  name: string
  startDate: string
  endDate: string
  status: WorkStatus
  pmMemberId: string
}

export interface Phase {
  id: string
  projectId: string
  name: PhaseName
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
}

export interface CreateProjectInput {
  name: string
  startDate: string
  endDate: string
  status: WorkStatus
  pmMemberId: string
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
}

export interface UpdateProjectStructureInput {
  pmMemberId: string
  assignments: ProjectStructureAssignmentInput[]
}
