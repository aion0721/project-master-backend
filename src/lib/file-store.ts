import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { z } from 'zod'
import {
  seedAssignments,
  seedMembers,
  seedPhases,
  seedProjects,
  seedUsers,
} from '../data/seedData.js'
import type { Member, Phase, Project, ProjectAssignment, UserProfile } from '../types/domain.js'

const workStatusSchema = z.enum(['未着手', '進行中', '完了', '遅延'])
const projectLinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
})

const projectSchema = z
  .object({
    projectNumber: z.string().min(1),
    name: z.string().min(1),
    startDate: z.string().date(),
    endDate: z.string().date(),
    status: workStatusSchema,
    pmMemberId: z.string().min(1),
    projectLinks: z.array(projectLinkSchema).optional(),
    projectLink: z.string().url().nullable().optional(),
  })
  .transform(({ projectLink, projectLinks, ...project }) => ({
    ...project,
    projectLinks: projectLinks ?? (projectLink ? [{ label: '案件リンク', url: projectLink }] : []),
  }))

const phaseSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1),
  startWeek: z.number().int().min(1),
  endWeek: z.number().int().min(1),
  status: workStatusSchema,
  progress: z.number().min(0).max(100),
  assigneeMemberId: z.string().min(1),
})

const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  managerId: z.string().min(1).nullable(),
})

const assignmentSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  memberId: z.string().min(1),
  responsibility: z.string().min(1),
  reportsToMemberId: z.string().min(1).nullable().optional(),
})

const userSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  bookmarkedProjectIds: z.array(z.string().min(1)),
})

const storeSchema = {
  projects: z.array(projectSchema),
  phases: z.array(phaseSchema),
  members: z.array(memberSchema),
  assignments: z.array(assignmentSchema),
  users: z.array(userSchema),
} as const

type StoreKey = keyof typeof storeSchema

export interface StoreData {
  projects: Project[]
  phases: Phase[]
  members: Member[]
  assignments: ProjectAssignment[]
  users: UserProfile[]
}

const dataDirectory = resolve(process.cwd(), 'data')
const filePaths: Record<StoreKey, string> = {
  projects: resolve(dataDirectory, 'projects.json'),
  phases: resolve(dataDirectory, 'phases.json'),
  members: resolve(dataDirectory, 'members.json'),
  assignments: resolve(dataDirectory, 'assignments.json'),
  users: resolve(dataDirectory, 'users.json'),
}

const defaultData: StoreData = {
  projects: seedProjects,
  phases: seedPhases,
  members: seedMembers,
  assignments: seedAssignments,
  users: seedUsers,
}

let cache: StoreData | null = null
let initPromise: Promise<StoreData> | null = null
let writeQueue = Promise.resolve()

function cloneEntries<T>(items: T[]) {
  return items.map((item) => ({ ...item }))
}

function cloneStore(store: StoreData): StoreData {
  return {
    projects: cloneEntries(store.projects).map((project) => ({
      ...project,
      projectLinks: project.projectLinks.map((link) => ({ ...link })),
    })),
    phases: cloneEntries(store.phases),
    members: cloneEntries(store.members),
    assignments: cloneEntries(store.assignments),
    users: cloneEntries(store.users).map((user) => ({
      ...user,
      bookmarkedProjectIds: [...user.bookmarkedProjectIds],
    })),
  }
}

async function writeJsonAtomic(path: string, value: unknown) {
  const tempPath = `${path}.tmp`
  await mkdir(dirname(path), { recursive: true })
  await writeFile(tempPath, JSON.stringify(value, null, 2), 'utf-8')
  await rename(tempPath, path)
}

async function ensureFileExists(key: StoreKey) {
  const path = filePaths[key]

  try {
    await readFile(path, 'utf-8')
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : ''

    if (code !== 'ENOENT') {
      throw error
    }

    await writeJsonAtomic(path, defaultData[key])
  }
}

async function readAndValidateFile<Key extends StoreKey>(key: Key): Promise<StoreData[Key]> {
  const path = filePaths[key]
  const raw = await readFile(path, 'utf-8')
  const parsed = JSON.parse(raw)
  return storeSchema[key].parse(parsed) as StoreData[Key]
}

async function loadFromDisk(): Promise<StoreData> {
  await mkdir(dataDirectory, { recursive: true })
  await Promise.all((Object.keys(filePaths) as StoreKey[]).map((key) => ensureFileExists(key)))

  const [projects, phases, members, assignments, users] = await Promise.all([
    readAndValidateFile('projects'),
    readAndValidateFile('phases'),
    readAndValidateFile('members'),
    readAndValidateFile('assignments'),
    readAndValidateFile('users'),
  ])

  return {
    projects,
    phases,
    members,
    assignments,
    users,
  }
}

async function ensureLoaded() {
  if (cache) {
    return cache
  }

  if (!initPromise) {
    initPromise = loadFromDisk().then((loaded) => {
      cache = loaded
      return loaded
    })
  }

  return initPromise
}

async function persistKeys(store: StoreData, keys: StoreKey[]) {
  for (const key of keys) {
    await writeJsonAtomic(filePaths[key], store[key])
  }
}

export async function ensureStoreReady() {
  await ensureLoaded()
}

export async function getStore(): Promise<StoreData> {
  const store = await ensureLoaded()
  return cloneStore(store)
}

export async function updateStore<T>(
  keys: StoreKey[],
  mutator: (draft: StoreData) => Promise<T> | T,
): Promise<T> {
  let result!: T

  const operation = writeQueue.then(async () => {
    const current = await ensureLoaded()
    const draft = cloneStore(current)
    result = await mutator(draft)
    await persistKeys(draft, keys)
    cache = draft
  })

  writeQueue = operation.catch(() => undefined)
  await operation
  return result
}
