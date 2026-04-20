import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { z } from 'zod'

const actorTypeSchema = z.enum(['assistant', 'user', 'system'])
const auditStatusSchema = z.enum(['validated', 'executed', 'failed'])

const auditEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().datetime(),
  actorType: actorTypeSchema,
  actorId: z.string().min(1).nullable().optional(),
  commandType: z.string().min(1),
  targetType: z.string().min(1),
  targetId: z.string().min(1).nullable().optional(),
  dryRun: z.boolean(),
  status: auditStatusSchema,
  input: z.unknown(),
  result: z.unknown().optional(),
  errorMessage: z.string().nullable().optional(),
})

const auditLogSchema = z.array(auditEntrySchema)

export type AiAuditActorType = z.infer<typeof actorTypeSchema>
export type AiAuditStatus = z.infer<typeof auditStatusSchema>
export type AiAuditEntry = z.infer<typeof auditEntrySchema>

const auditLogPath = resolve(process.cwd(), 'data', 'ai-audit-log.json')
let writeQueue = Promise.resolve()

async function writeJsonAtomic(path: string, value: unknown) {
  const tempPath = `${path}.tmp`
  await mkdir(dirname(path), { recursive: true })
  await writeFile(tempPath, JSON.stringify(value, null, 2), 'utf-8')
  await rename(tempPath, path)
}

async function readAuditEntries() {
  try {
    const raw = await readFile(auditLogPath, 'utf-8')
    return auditLogSchema.parse(JSON.parse(raw))
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : ''

    if (code === 'ENOENT') {
      await writeJsonAtomic(auditLogPath, [])
      return [] satisfies AiAuditEntry[]
    }

    throw error
  }
}

function createAuditId(entries: AiAuditEntry[]) {
  const nextNumber =
    entries
      .map((entry) => Number(entry.id.replace('ai-audit-', '')))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0) + 1

  return `ai-audit-${String(nextNumber).padStart(6, '0')}`
}

export async function listAiAuditEntries(limit = 50) {
  const entries = await readAuditEntries()
  return entries.slice(-Math.max(1, limit)).reverse()
}

export async function appendAiAuditEntry(
  entry: Omit<AiAuditEntry, 'id' | 'timestamp'>,
) {
  let createdEntry!: AiAuditEntry

  const operation = writeQueue.then(async () => {
    const entries = await readAuditEntries()
    createdEntry = {
      id: createAuditId(entries),
      timestamp: new Date().toISOString(),
      ...entry,
    }
    entries.push(createdEntry)
    await writeJsonAtomic(auditLogPath, entries)
  })

  writeQueue = operation.catch(() => undefined)
  await operation
  return createdEntry
}
