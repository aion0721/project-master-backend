import { Hono } from 'hono'
import { getCrossProjectWeeks } from '../lib/project-service.js'

export const crossProjectRoutes = new Hono()

crossProjectRoutes.get('/cross-project-weeks', (c) =>
  c.json(getCrossProjectWeeks()),
)
