import { getStore, updateStore } from './file-store.js'
import type { UserProfile } from '../types/domain.js'

function normalizeUsername(username: string) {
  return username.trim()
}

function getNextUserId(users: UserProfile[]) {
  const nextId =
    users
      .map((user) => Number(user.id.replace(/^u/, '')))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0) + 1

  return `u${nextId}`
}

function cloneUser(user: UserProfile) {
  return {
    ...user,
    bookmarkedProjectIds: [...user.bookmarkedProjectIds],
  }
}

export async function getUserById(userId: string) {
  const store = await getStore()
  const user = store.users.find((item) => item.id === userId)
  return user ? cloneUser(user) : null
}

export async function loginUser(username: string) {
  const normalizedUsername = normalizeUsername(username)

  if (!normalizedUsername) {
    throw new Error('username is required')
  }

  return updateStore(['users'], (store) => {
    const existingUser = store.users.find(
      (item) => item.username.toLocaleLowerCase() === normalizedUsername.toLocaleLowerCase(),
    )

    if (existingUser) {
      return cloneUser(existingUser)
    }

    const nextUser: UserProfile = {
      id: getNextUserId(store.users),
      username: normalizedUsername,
      bookmarkedProjectIds: [],
    }

    store.users.push(nextUser)
    return cloneUser(nextUser)
  })
}

export async function toggleBookmark(userId: string, projectId: string) {
  return updateStore(['users'], (store) => {
    const user = store.users.find((item) => item.id === userId)

    if (!user) {
      throw new Error('User not found')
    }

    const projectExists = store.projects.some((project) => project.projectNumber === projectId)

    if (!projectExists) {
      throw new Error('Project not found')
    }

    const alreadyBookmarked = user.bookmarkedProjectIds.includes(projectId)

    user.bookmarkedProjectIds = alreadyBookmarked
      ? user.bookmarkedProjectIds.filter((id) => id !== projectId)
      : [...user.bookmarkedProjectIds, projectId]

    return cloneUser(user)
  })
}
