import { readFileSync, existsSync } from 'node:fs'
import { createServer } from 'node:https'
import { resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { app } from './app.js'
import { ensureStoreReady } from './lib/file-store.js'

const port = Number(process.env.PORT ?? 8787)
const tlsKeyPath = resolve(process.cwd(), 'src', 'certs', 'tls.key')
const tlsCertPath = resolve(process.cwd(), 'src', 'certs', 'tls.crt')

function getTlsOptions() {
  if (!existsSync(tlsKeyPath) || !existsSync(tlsCertPath)) {
    return null
  }

  return {
    key: readFileSync(tlsKeyPath),
    cert: readFileSync(tlsCertPath),
  }
}

async function bootstrap() {
  await ensureStoreReady()

  const tlsOptions = getTlsOptions()
  const protocol = tlsOptions ? 'https' : 'http'

  serve(
    tlsOptions
      ? {
          fetch: app.fetch,
          port,
          createServer,
          serverOptions: tlsOptions,
        }
      : {
          fetch: app.fetch,
          port,
        },
    (info) => {
      console.log(`API server is running at ${protocol}://localhost:${info.port}`)
    },
  )
}

void bootstrap()
