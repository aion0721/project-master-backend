import { serve } from '@hono/node-server'
import { app } from './app.js'
import { ensureStoreReady } from './lib/file-store.js'

const port = Number(process.env.PORT ?? 8787)

async function bootstrap() {
  await ensureStoreReady()

  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`API server is running at http://localhost:${info.port}`)
    },
  )
}

void bootstrap()
