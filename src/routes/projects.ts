import { Hono } from 'hono'
import { z } from 'zod'
import {
  createMember,
  createProject,
  deleteMember,
  getProjectDetail,
  listMembers,
  listProjects,
  updateMember,
  updatePhase,
  updateProjectCurrentPhase,
  updateProjectLink,
  updateProjectPhases,
  updateProjectSchedule,
  updateProjectStructure,
} from '../lib/project-service.js'

function isValidOptionalUrl(value: string) {
  if (!value.trim()) {
    return true
  }

  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

const workStatusSchema = z.enum(['未着手', '進行中', '完了', '遅延'])

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
    projectLink: z.string().trim().max(500).optional().default(''),
  })

const createMemberSchema = z.object({
  id: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  role: z.string().trim().min(1).max(100),
  managerId: z.string().min(1).nullable(),
})

const updateMemberSchema = z.object({
  name: z.string().trim().min(1).max(100),
  role: z.string().trim().min(1).max(100),
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

const updateProjectLinkSchema = z
  .object({
    projectLink: z.string().trim().max(500),
  })
  .refine((value) => isValidOptionalUrl(value.projectLink), {
    message: 'projectLink must be a valid URL',
    path: ['projectLink'],
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

projectRoutes.get('/projects', async (c) =>
  c.json({
    items: await listProjects(),
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

projectRoutes.patch('/projects/:projectNumber/link', async (c) => {
  const paramsSchema = z.object({
    projectNumber: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = updateProjectLinkSchema.safeParse(body)

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
    const detail = await updateProjectLink(parsedParams.data.projectNumber, {
      projectLink: parsedBody.data.projectLink.trim() || null,
    })
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project link'
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
