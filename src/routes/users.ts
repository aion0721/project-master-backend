import { Hono } from 'hono'
import { z } from 'zod'
import { getUserById, loginUser, toggleBookmark } from '../lib/user-service.js'

const loginSchema = z.object({
  memberKey: z.string().trim().min(1).max(100),
})

const bookmarkSchema = z.object({
  projectId: z.string().min(1),
})

export const userRoutes = new Hono()

userRoutes.post('/members/login', async (c) => {
  const body = await c.req.json()
  const parsed = loginSchema.safeParse(body)

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
    const user = await loginUser(parsed.data.memberKey)
    return c.json({ user })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to select member'
    const status = message === 'Member not found' ? 404 : 400
    return c.json({ message }, status)
  }
})

userRoutes.get('/members/:userId', async (c) => {
  const paramsSchema = z.object({
    userId: z.string().min(1),
  })
  const parsed = paramsSchema.safeParse(c.req.param())

  if (!parsed.success) {
    return c.json({ message: 'userId is invalid' }, 400)
  }

  const user = await getUserById(parsed.data.userId)

  if (!user) {
    return c.json({ message: 'Member not found' }, 404)
  }

  return c.json({ user })
})

userRoutes.patch('/members/:userId/bookmarks', async (c) => {
  const paramsSchema = z.object({
    userId: z.string().min(1),
  })
  const parsedParams = paramsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    return c.json({ message: 'userId is invalid' }, 400)
  }

  const body = await c.req.json()
  const parsedBody = bookmarkSchema.safeParse(body)

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
    const user = await toggleBookmark(parsedParams.data.userId, parsedBody.data.projectId)
    return c.json({ user })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update bookmark'
    const status = message === 'Member not found' || message === 'Project not found' ? 404 : 400
    return c.json({ message }, status)
  }
})
