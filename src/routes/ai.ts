import { Hono } from 'hono'
import { z } from 'zod'
import {
  executeAiCommand,
  getAiAuditLog,
  getAiCapabilities,
  getAiHealth,
  getAiProjectContext,
} from '../lib/ai-service.js'
import { isValidProjectLinkTarget } from '../lib/project-link-target.js'

const actorSchema = z.object({
  type: z.enum(['assistant', 'user', 'system']),
  id: z.string().trim().min(1).max(100).optional(),
})

const aiWorkStatusSchema = z.enum(['not_started', 'in_progress', 'completed', 'delayed'])

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

const aiToWorkStatusMap = {
  not_started: '未着手',
  in_progress: '進行中',
  completed: '完了',
  delayed: '遅延',
} as const

const createProjectCommandSchema = z
  .object({
    type: z.literal('create_project'),
    payload: z.object({
      projectNumber: z.string().trim().min(1).max(50),
      name: z.string().trim().min(1).max(100),
      startDate: z.string().date(),
      endDate: z.string().date(),
      status: aiWorkStatusSchema,
      pmMemberId: z.string().trim().min(1),
      note: z.string().trim().max(2000).nullable().optional(),
      hasReportItems: z.boolean().optional().default(false),
      initialPhaseNames: z.array(standardPhaseNameSchema).optional().default([]),
      relatedSystemIds: z.array(z.string().trim().min(1)).optional().default([]),
      projectLinks: z.array(projectLinkSchema).optional().default([]),
    }),
  })

const updateProjectPhasesCommandSchema = z.object({
  type: z.literal('update_project_phases'),
  projectNumber: z.string().trim().min(1),
  payload: z.object({
    phases: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).optional(),
            name: z.string().trim().min(1).max(100),
            startWeek: z.number().int().min(1),
            endWeek: z.number().int().min(1),
            status: aiWorkStatusSchema,
            progress: z.number().int().min(0).max(100),
          })
          .refine((phase) => phase.endWeek >= phase.startWeek, {
            message: 'endWeek must be greater than or equal to startWeek',
            path: ['endWeek'],
          }),
      )
      .min(1),
  }),
})

const executeAiCommandSchema = z.object({
  actor: actorSchema.optional().default({ type: 'assistant' }),
  dryRun: z.boolean().optional().default(false),
  command: z.discriminatedUnion('type', [createProjectCommandSchema, updateProjectPhasesCommandSchema]),
})

const projectParamsSchema = z.object({
  projectNumber: z.string().min(1),
})

const auditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

function toErrorResponseStatus(message: string) {
  return message === 'Project not found' || message === 'Phase not found in project' ? 404 : 400
}

function normalizeAiCommand(input: z.infer<typeof executeAiCommandSchema>['command']) {
  if (input.type === 'create_project') {
    return {
      type: input.type,
      payload: {
        ...input.payload,
        status: aiToWorkStatusMap[input.payload.status],
      },
    } as const
  }

  return {
    type: input.type,
    projectNumber: input.projectNumber,
    payload: {
      phases: input.payload.phases.map((phase) => ({
        ...phase,
        status: aiToWorkStatusMap[phase.status],
      })),
    },
  } as const
}

export const aiRoutes = new Hono()

aiRoutes.get('/ai/health', async (c) =>
  c.json(await getAiHealth()),
)

aiRoutes.get('/ai/capabilities', async (c) =>
  c.json(await getAiCapabilities()),
)

aiRoutes.get('/ai/projects/:projectNumber/context', async (c) => {
  const parsedParams = projectParamsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'projectNumber is invalid' }, 400)
  }

  const context = await getAiProjectContext(parsedParams.data.projectNumber)

  if (!context) {
    return c.json({ message: 'Project not found' }, 404)
  }

  return c.json(context)
})

aiRoutes.get('/ai/audit-log', async (c) => {
  const parsedQuery = auditLogQuerySchema.safeParse(c.req.query())

  if (!parsedQuery.success) {
    return c.json(
      {
        message: 'Query is invalid',
        issues: parsedQuery.error.issues,
      },
      400,
    )
  }

  return c.json({
    items: await getAiAuditLog(parsedQuery.data.limit),
  })
})

aiRoutes.post('/ai/commands/execute', async (c) => {
  const body = await c.req.json()
  const parsedBody = executeAiCommandSchema.safeParse(body)

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
    const result = await executeAiCommand(
      normalizeAiCommand(parsedBody.data.command),
      parsedBody.data.actor,
      parsedBody.data.dryRun,
    )
    return c.json(result, parsedBody.data.dryRun ? 200 : 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to execute AI command'
    const auditEntry =
      error instanceof Error && 'auditEntry' in error ? Reflect.get(error, 'auditEntry') : undefined

    return c.json(
      {
        message,
        auditEntry,
      },
      toErrorResponseStatus(message),
    )
  }
})
