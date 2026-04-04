import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { crossProjectRoutes } from './routes/cross-project.js'
import { healthRoutes } from './routes/health.js'
import { projectRoutes } from './routes/projects.js'
import { userRoutes } from './routes/users.js'

export const app = new Hono()

app.use('*', cors())

app.get('/', (c) =>
  c.json({
    name: 'project-master-backend',
    message: 'Project management API is running',
  }),
)

app.route('/', healthRoutes)
app.route('/api', projectRoutes)
app.route('/api', crossProjectRoutes)
app.route('/api', userRoutes)
