import { Hono } from 'hono'
import { z } from 'zod'
import { isValidProjectLinkTarget } from '../lib/project-link-target.js'
import {
  createMember,
  createProject,
  createSystemRelation,
  createSystemTransaction,
  createSystem,
  deleteMember,
  deleteSystemRelation,
  deleteSystemTransaction,
  deleteSystem,
  getProjectDepartmentAssignments,
  getProjectDetail,
  listMembers,
  listProjectDepartments,
  listProjects,
  listSystemAssignments,
  listSystemRelations,
  listSystemTransactions,
  listSystemTransactionSteps,
  listSystems,
  updateMember,
  updatePhase,
  updateProjectCurrentPhase,
  updateProjectDepartments,
  updateProjectEvents,
  updateProjectLinks,
  updateProjectNote,
  updateProjectStatusEntries,
  updateProjectReportStatus,
  updateProjectStatusOverride,
  updateProjectSystems,
  updateProjectPhases,
  updateProjectSchedule,
  updateProjectSummary,
  updateProjectStructure,
  updateSystemRelation,
  updateSystem,
  updateSystemStructure,
  updateSystemTransaction,
} from '../lib/project-service.js'

const projectLinkSchema = z.object({
  label: z.string().trim().min(1).max(100),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((value) => isValidProjectLinkTarget(value), {
      message: '有効な URL またはネットワークパスを入力してください。',
    }),
})

const workStatusSchema = z.enum(['未着手', '進行中', '完了', '遅延'])
const standardPhaseNameSchema = z.enum([
  '予備検討',
  '基礎検討',
  '基本設計',
  '詳細設計',
  'CT',
  'ITa',
  'ITb',
  'UAT',
  '移行',
])
const projectStatusOverrideSchema = z.enum(['未着手', '進行中', '完了', '遅延', '中止'])

const workStatusLabelMap = {
  not_started: '未着手',
  in_progress: '進行中',
  completed: '完了',
  delayed: '遅延',
} as const

const createProjectSchema = z
  .object({
    projectNumber: z.string().trim().min(1).max(50),
    name: z.string().min(1).max(100),
    startDate: z.string().date(),
    endDate: z.string().date(),
    status: z.enum(['not_started', 'in_progress', 'completed', 'delayed']),
    pmMemberId: z.string().min(1),
    note: z.string().trim().max(2000).nullable().optional(),
    hasReportItems: z.boolean().optional().default(false),
    initialPhaseNames: z.array(standardPhaseNameSchema).optional().default([]),
    relatedSystemIds: z.array(z.string().trim().min(1)).optional().default([]),
    projectLinks: z.array(projectLinkSchema).optional().default([]),
  })

const createSystemSchema = z.object({
  id: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  ownerMemberId: z.string().min(1).nullable().optional(),
  departmentNames: z.array(z.string().trim().min(1).max(100)).optional().default([]),
  note: z.string().trim().max(500).nullable().optional(),
  systemLinks: z.array(projectLinkSchema).optional().default([]),
})

const createSystemRelationSchema = z.object({
  sourceSystemId: z.string().trim().min(1),
  targetSystemId: z.string().trim().min(1),
  protocol: z.string().trim().max(100).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
})

const updateSystemRelationSchema = createSystemRelationSchema

const systemTransactionStepSchema = z.object({
  id: z.string().min(1).optional(),
  relationId: z.string().trim().min(1),
  sourceSystemId: z.string().trim().min(1),
  targetSystemId: z.string().trim().min(1),
  stepOrder: z.number().int().min(1),
  actionLabel: z.string().trim().max(100).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
})

const createSystemTransactionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  dataLabel: z.string().trim().min(1).max(100),
  note: z.string().trim().max(500).nullable().optional(),
  steps: z.array(systemTransactionStepSchema).min(1),
})

const updateSystemTransactionSchema = createSystemTransactionSchema

const updateSystemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  ownerMemberId: z.string().min(1).nullable().optional(),
  departmentNames: z.array(z.string().trim().min(1).max(100)).optional().default([]),
  note: z.string().trim().max(500).nullable().optional(),
  systemLinks: z.array(projectLinkSchema).optional(),
})

const updateSystemStructureSchema = z.object({
  ownerMemberId: z.string().min(1),
  assignments: z.array(
    z.object({
      id: z.string().min(1).optional(),
      memberId: z.string().min(1),
      responsibility: z.string().trim().min(1).max(100),
      reportsToMemberId: z.string().min(1).nullable().optional(),
    }),
  ),
})

const createMemberSchema = z.object({
  id: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  departmentCode: z.string().trim().min(1).max(50),
  departmentName: z.string().trim().min(1).max(100),
  role: z.string().trim().min(1).max(100),
  lineLabel: z.string().trim().max(100).optional(),
  managerId: z.string().min(1).nullable(),
})

const updateMemberSchema = z.object({
  name: z.string().trim().min(1).max(100),
  departmentCode: z.string().trim().min(1).max(50),
  departmentName: z.string().trim().min(1).max(100),
  role: z.string().trim().min(1).max(100),
  lineLabel: z.string().trim().max(100).optional(),
  managerId: z.string().min(1).nullable(),
})

const updatePhaseSchema = z
  .object({
    startWeek: z.number().int().min(1),
    endWeek: z.number().int().min(1),
    status: workStatusSchema,
    progress: z.number().int().min(0).max(100),
  })
  .refine((value) => value.endWeek >= value.startWeek, {
    message: 'endWeek must be greater than or equal to startWeek',
    path: ['endWeek'],
  })

const updateCurrentPhaseSchema = z.object({
  phaseId: z.string().min(1),
})

const updateProjectScheduleSchema = z
  .object({
    startDate: z.string().date(),
    endDate: z.string().date(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: 'endDate must be greater than or equal to startDate',
    path: ['endDate'],
  })

const updateProjectSummarySchema = z.object({
  projectNumber: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
})

const projectDepartmentRoleSchema = z.enum(['主管', '実行', '支援', '利用'])

const updateProjectDepartmentsSchema = z.object({
  departments: z.array(
    z.object({
      id: z.string().trim().min(1).optional(),
      departmentCode: z.string().trim().min(1).max(50),
      departmentName: z.string().trim().min(1).max(100),
      role: projectDepartmentRoleSchema,
      note: z.string().trim().max(500).nullable().optional(),
    }),
  ),
})

const updateProjectLinksSchema = z
  .object({
    projectLinks: z.array(projectLinkSchema),
  })

const updateProjectSystemsSchema = z.object({
  relatedSystemIds: z.array(z.string().trim().min(1)),
})

const updateProjectNoteSchema = z.object({
  note: z.string().trim().max(2000).nullable().optional(),
})

const updateProjectStatusEntriesSchema = z.object({
  statusEntries: z.array(
    z.object({
      date: z.string().date(),
      content: z.string().trim().min(1).max(4000),
    }),
  ),
})

const updateProjectReportStatusSchema = z.object({
  hasReportItems: z.boolean(),
})

const updateProjectStatusOverrideSchema = z.object({
  statusOverride: projectStatusOverrideSchema.nullable().optional(),
})

const updateProjectPhasesSchema = z.object({
  phases: z
    .array(
      z
        .object({
          id: z.string().min(1).optional(),
          name: z.string().trim().min(1).max(100),
          startWeek: z.number().int().min(1),
          endWeek: z.number().int().min(1),
          status: workStatusSchema,
          progress: z.number().int().min(0).max(100),
        })
        .refine((value) => value.endWeek >= value.startWeek, {
          message: 'endWeek must be greater than or equal to startWeek',
          path: ['endWeek'],
        }),
    )
    .min(1),
})

const updateProjectEventsSchema = z.object({
  events: z.array(
    z.object({
      id: z.string().min(1).optional(),
      name: z.string().trim().min(1).max(100),
      week: z.number().int().min(1),
      status: workStatusSchema,
      ownerMemberId: z.string().min(1).nullable().optional(),
      note: z.string().trim().max(500).nullable().optional(),
    }),
  ),
})

const updateProjectStructureSchema = z.object({
  pmMemberId: z.string().min(1),
  assignments: z.array(
    z.object({
      id: z.string().min(1).optional(),
      memberId: z.string().min(1),
      responsibility: z.string().trim().min(1).max(100),
      reportsToMemberId: z.string().min(1).nullable().optional(),
    }),
  ),
})

export const projectRoutes = new Hono()

projectRoutes.get('/members', async (c) =>
  c.json({
    items: await listMembers(),
  }),
)

projectRoutes.post('/members', async (c) => {
  const body = await c.req.json()
  const parsed = createMemberSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsed.error.issues,
      },
      400,
    )
  }

  try {
    const result = await createMember(parsed.data)
    return c.json(result, 201)
  } catch (error) {
    return c.json(
      {
        message: error instanceof Error ? error.message : 'Failed to create member',
      },
      400,
    )
  }
})

projectRoutes.patch('/members/:memberId', async (c) => {
  const paramsSchema = z.object({
    memberId: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'memberId is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateMemberSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const result = await updateMember(parsedParams.data.memberId, parsedBody.data)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update member'
    const status = message === 'Member not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.delete('/members/:memberId', async (c) => {
  const paramsSchema = z.object({
    memberId: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'memberId is invalid' }, 400)
  }

  try {
    const result = await deleteMember(parsedParams.data.memberId)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete member'
    const status = message === 'Member not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.get('/systems', async (c) =>
  c.json({
    items: await listSystems(),
  }),
)

projectRoutes.get('/system-relations', async (c) =>
  c.json({
    items: await listSystemRelations(),
  }),
)

projectRoutes.get('/system-assignments', async (c) =>
  c.json({
    items: await listSystemAssignments(),
  }),
)

projectRoutes.get('/system-transactions', async (c) =>
  c.json({
    items: await listSystemTransactions(),
  }),
)

projectRoutes.get('/system-transaction-steps', async (c) =>
  c.json({
    items: await listSystemTransactionSteps(),
  }),
)

projectRoutes.post('/system-transactions', async (c) => {
  const body = await c.req.json()
  const parsed = createSystemTransactionSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsed.error.issues,
      },
      400,
    )
  }

  try {
    const result = await createSystemTransaction(parsed.data)
    return c.json(result, 201)
  } catch (error) {
    return c.json(
      {
        message: error instanceof Error ? error.message : 'Failed to create system transaction',
      },
      400,
    )
  }
})

projectRoutes.post('/systems', async (c) => {
  const body = await c.req.json()
  const parsed = createSystemSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsed.error.issues,
      },
      400,
    )
  }

  try {
    const result = await createSystem(parsed.data)
    return c.json(result, 201)
  } catch (error) {
    return c.json(
      {
        message: error instanceof Error ? error.message : 'Failed to create system',
      },
      400,
    )
  }
})

projectRoutes.post('/system-relations', async (c) => {
  const body = await c.req.json()
  const parsed = createSystemRelationSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsed.error.issues,
      },
      400,
    )
  }

  try {
    const result = await createSystemRelation(parsed.data)
    return c.json(result, 201)
  } catch (error) {
    return c.json(
      {
        message: error instanceof Error ? error.message : 'Failed to create system relation',
      },
      400,
    )
  }
})

projectRoutes.patch('/system-relations/:relationId', async (c) => {
  const paramsSchema = z.object({
    relationId: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'relationId is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateSystemRelationSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const result = await updateSystemRelation(parsedParams.data.relationId, parsedBody.data)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update system relation'
    const status = message === 'System relation not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.patch('/systems/:systemId', async (c) => {
  const paramsSchema = z.object({
    systemId: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'systemId is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateSystemSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const result = await updateSystem(parsedParams.data.systemId, parsedBody.data)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update system'
    const status = message === 'System not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.patch('/systems/:systemId/structure', async (c) => {
  const paramsSchema = z.object({
    systemId: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'systemId is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateSystemStructureSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const result = await updateSystemStructure(parsedParams.data.systemId, parsedBody.data)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update system structure'
    const status = message === 'System not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.delete('/systems/:systemId', async (c) => {
  const paramsSchema = z.object({
    systemId: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'systemId is invalid' }, 400)
  }

  try {
    const result = await deleteSystem(parsedParams.data.systemId)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete system'
    const status = message === 'System not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.delete('/system-relations/:relationId', async (c) => {
  const paramsSchema = z.object({
    relationId: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'relationId is invalid' }, 400)
  }

  try {
    const result = await deleteSystemRelation(parsedParams.data.relationId)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete system relation'
    const status = message === 'System relation not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.patch('/system-transactions/:transactionId', async (c) => {
  const paramsSchema = z.object({
    transactionId: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'transactionId is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateSystemTransactionSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const result = await updateSystemTransaction(parsedParams.data.transactionId, parsedBody.data)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update system transaction'
    const status = message === 'System transaction not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.delete('/system-transactions/:transactionId', async (c) => {
  const paramsSchema = z.object({
    transactionId: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'transactionId is invalid' }, 400)
  }

  try {
    const result = await deleteSystemTransaction(parsedParams.data.transactionId)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete system transaction'
    const status = message === 'System transaction not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.get('/projects', async (c) =>
  c.json({
    items: await listProjects(),
  }),
)

projectRoutes.get('/project-departments', async (c) =>
  c.json({
    items: await listProjectDepartments(),
  }),
)

projectRoutes.post('/projects', async (c) => {
  const body = await c.req.json()
  const parsed = createProjectSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsed.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await createProject({
      ...parsed.data,
      status: workStatusLabelMap[parsed.data.status],
    })

    return c.json(detail, 201)
  } catch (error) {
    return c.json(
      {
        message: error instanceof Error ? error.message : 'Failed to create project',
      },
      400,
    )
  }
})

projectRoutes.get('/projects/:projectNumber', async (c) => {
  const paramsSchema = z.object({
    projectNumber: z.string().min(1),
  })
  const parsed = paramsSchema.safeParse(c.req.param())

  if (!parsed.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const detail = await getProjectDetail(parsed.data.projectNumber)

  if (!detail) {
    return c.json({ message: 'Project not found' }, 404)
  }

  return c.json(detail)
})

projectRoutes.get('/projects/:projectNumber/departments', async (c) => {
  const paramsSchema = z.object({
    projectNumber: z.string().min(1),
  })
  const parsed = paramsSchema.safeParse(c.req.param())

  if (!parsed.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const departments = await getProjectDepartmentAssignments(parsed.data.projectNumber)

  if (!departments) {
    return c.json({ message: 'Project not found' }, 404)
  }

  return c.json({
    items: departments,
  })
})

projectRoutes.patch('/projects/:projectNumber', async (c) => {
  const paramsSchema = z.object({
    projectNumber: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateProjectSummarySchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await updateProjectSummary(parsedParams.data.projectNumber, parsedBody.data)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project summary'
    const status =
      message === 'Project not found' ? 404 : 400

    return c.json({ message }, status)
  }
})

projectRoutes.patch('/projects/:projectNumber/departments', async (c) => {
  const paramsSchema = z.object({
    projectNumber: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateProjectDepartmentsSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const result = await updateProjectDepartments(parsedParams.data.projectNumber, parsedBody.data)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project departments'
    const status = message === 'Project not found' ? 404 : 400

    return c.json({ message }, status)
  }
})

projectRoutes.patch('/projects/:projectNumber/current-phase', async (c) => {
  const paramsSchema = z.object({
    projectNumber: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateCurrentPhaseSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await updateProjectCurrentPhase(parsedParams.data.projectNumber, parsedBody.data.phaseId)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update current phase'
    const status =
      message === 'Project not found' || message === 'Phase not found in project' ? 404 : 400

    return c.json({ message }, status)
  }
})

projectRoutes.patch('/projects/:projectNumber/schedule', async (c) => {
  const paramsSchema = z.object({
    projectNumber: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateProjectScheduleSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await updateProjectSchedule(parsedParams.data.projectNumber, parsedBody.data)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project schedule'
    const status = message === 'Project not found' ? 404 : 400

    return c.json({ message }, status)
  }
})

projectRoutes.patch('/projects/:projectNumber/links', async (c) => {
  const paramsSchema = z.object({
    projectNumber: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateProjectLinksSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await updateProjectLinks(parsedParams.data.projectNumber, parsedBody.data)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project links'
    const status = message === 'Project not found' ? 404 : 400

    return c.json({ message }, status)
  }
})

projectRoutes.patch('/projects/:projectNumber/systems', async (c) => {
  const paramsSchema = z.object({
    projectNumber: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateProjectSystemsSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await updateProjectSystems(parsedParams.data.projectNumber, parsedBody.data)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project systems'
    const status = message === 'Project not found' ? 404 : 400

    return c.json({ message }, status)
  }
})

projectRoutes.patch('/projects/:projectNumber/phases', async (c) => {
  const paramsSchema = z.object({
    projectNumber: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateProjectPhasesSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await updateProjectPhases(parsedParams.data.projectNumber, parsedBody.data)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project phases'
    const status = message === 'Project not found' ? 404 : 400

    return c.json({ message }, status)
  }
})

projectRoutes.patch('/projects/:projectNumber/note', async (c) => {
  const projectNumber = c.req.param('projectNumber')
  const body = await c.req.json()
  const parsed = updateProjectNoteSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsed.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await updateProjectNote(projectNumber, parsed.data)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project note'
    const status = message === 'Project not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.patch('/projects/:projectNumber/status-entries', async (c) => {
  const projectNumber = c.req.param('projectNumber')
  const body = await c.req.json()
  const parsed = updateProjectStatusEntriesSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsed.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await updateProjectStatusEntries(projectNumber, parsed.data)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project status entries'
    const status = message === 'Project not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.patch('/projects/:projectNumber/report-status', async (c) => {
  const projectNumber = c.req.param('projectNumber')
  const body = await c.req.json()
  const parsed = updateProjectReportStatusSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsed.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await updateProjectReportStatus(projectNumber, parsed.data)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project report status'
    const status = message === 'Project not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.patch('/projects/:projectNumber/status-override', async (c) => {
  const projectNumber = c.req.param('projectNumber')
  const body = await c.req.json()
  const parsed = updateProjectStatusOverrideSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsed.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await updateProjectStatusOverride(projectNumber, parsed.data)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project status override'
    const status = message === 'Project not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

projectRoutes.patch('/projects/:projectNumber/events', async (c) => {
  const paramsSchema = z.object({
    projectNumber: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateProjectEventsSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await updateProjectEvents(parsedParams.data.projectNumber, parsedBody.data)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project events'
    const status = message === 'Project not found' ? 404 : 400

    return c.json({ message }, status)
  }
})

projectRoutes.patch('/projects/:projectNumber/structure', async (c) => {
  const paramsSchema = z.object({
    projectNumber: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateProjectStructureSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const detail = await updateProjectStructure(parsedParams.data.projectNumber, parsedBody.data)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project structure'
    const status = message === 'Project not found' ? 404 : 400

    return c.json({ message }, status)
  }
})

projectRoutes.patch('/phases/:phaseId', async (c) => {
  const paramsSchema = z.object({
    phaseId: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'phaseId is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updatePhaseSchema.safeParse(body)

  if (!parsedBody.success) {
    return c.json(
      {
        message: 'Request body is invalid',
        issues: parsedBody.error.issues,
      },
      400,
    )
  }

  try {
    const result = await updatePhase(parsedParams.data.phaseId, parsedBody.data)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update phase'
    const status = message === 'Phase not found' || message === 'Project not found' ? 404 : 400

    return c.json({ message }, status)
  }
})
