import { Hono } from 'hono'
import { z } from 'zod'
import { getProjectDetail, listProjects } from '../lib/project-service.js'

export const projectRoutes = new Hono()

projectRoutes.get('/projects', (c) =>
  c.json({
    items: listProjects(),
  }),
)

projectRoutes.get('/projects/:projectId', (c) => {
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

  const detail = getProjectDetail(parsed.data.projectId)

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
