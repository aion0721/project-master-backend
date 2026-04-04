import { Hono } from 'hono'
import { z } from 'zod'
import {
  createProject,
  getProjectDetail,
  listMembers,
  listProjects,
  updatePhaseSchedule,
} from '../lib/project-service.js'

const workStatusSchema = z.enum(['not_started', 'in_progress', 'completed', 'delayed'])

const workStatusLabelMap = {
  not_started: '未着手',
  in_progress: '進行中',
  completed: '完了',
  delayed: '遅延',
} as const

const createProjectSchema = z
  .object({
    name: z.string().min(1).max(100),
    startDate: z.string().date(),
    endDate: z.string().date(),
    status: workStatusSchema,
    pmMemberId: z.string().min(1),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: 'endDate must be greater than or equal to startDate',
    path: ['endDate'],
  })

const updatePhaseScheduleSchema = z
  .object({
    startWeek: z.number().int().min(1),
    endWeek: z.number().int().min(1),
  })
  .refine((value) => value.endWeek >= value.startWeek, {
    message: 'endWeek must be greater than or equal to startWeek',
    path: ['endWeek'],
  })

export const projectRoutes = new Hono()

projectRoutes.get('/members', async (c) =>
  c.json({
    items: await listMembers(),
  }),
)

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

projectRoutes.get('/projects/:projectId', async (c) => {
  const paramsSchema = z.object({
    projectId: z.string().min(1),
  })
  const parsed = paramsSchema.safeParse(c.req.param())

  if (!parsed.success) {
    return c.json(
      {
        message: 'projectId is invalid',
      },
      400,
    )
  }

  const detail = await getProjectDetail(parsed.data.projectId)

  if (!detail) {
    return c.json(
      {
        message: 'Project not found',
      },
      404,
    )
  }

  return c.json(detail)
})

projectRoutes.patch('/phases/:phaseId', async (c) => {
  const paramsSchema = z.object({
    phaseId: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json(
      {
        message: 'phaseId is invalid',
      },
      400,
    )
  }

  const body = await c.req.json()
  const parsedBody = updatePhaseScheduleSchema.safeParse(body)

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
    const phase = await updatePhaseSchedule(parsedParams.data.phaseId, parsedBody.data)
    return c.json({ phase })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update phase schedule'
    const status = message === 'Phase not found' ? 404 : 400

    return c.json({ message }, status)
  }
})
