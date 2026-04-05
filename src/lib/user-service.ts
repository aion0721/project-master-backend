import type { Member } from '../types/domain.js'
import { getStore, updateStore } from './file-store.js'

const allWorkStatuses: NonNullable<Member['defaultProjectStatusFilters']> = ['未着手', '進行中', '遅延', '完了']

function normalizeMemberKey(memberKey: string) {
  return memberKey.trim()
}

function cloneMember(member: Partial<Member> & Pick<Member, 'id' | 'name' | 'role' | 'managerId'>) {
  const defaultProjectStatusFilters = member.defaultProjectStatusFilters ?? allWorkStatuses

  return {
    ...member,
    bookmarkedProjectIds: [...(member.bookmarkedProjectIds ?? [])],
    defaultProjectStatusFilters: allWorkStatuses.filter((status) =>
      defaultProjectStatusFilters.includes(status),
    ),
  } satisfies Member
}

export async function getUserById(memberId: string) {
  const store = await getStore()
  const member = store.members.find((item) => item.id === memberId)
  return member ? cloneMember(member) : null
}

export async function loginUser(memberKey: string) {
  const normalizedMemberKey = normalizeMemberKey(memberKey)

  if (!normalizedMemberKey) {
    throw new Error('memberKey is required')
  }

  const store = await getStore()
  const member = store.members.find(
    (item) =>
      item.id.toLocaleLowerCase() === normalizedMemberKey.toLocaleLowerCase() ||
      item.name.toLocaleLowerCase() === normalizedMemberKey.toLocaleLowerCase(),
  )

  if (!member) {
    throw new Error('Member not found')
  }

  return cloneMember(member)
}

export async function toggleBookmark(memberId: string, projectId: string) {
  return updateStore(['members'], (store) => {
    const member = store.members.find((item) => item.id === memberId)

    if (!member) {
      throw new Error('Member not found')
    }

    const projectExists = store.projects.some((project) => project.projectNumber === projectId)

    if (!projectExists) {
      throw new Error('Project not found')
    }

    const alreadyBookmarked = member.bookmarkedProjectIds.includes(projectId)

    member.bookmarkedProjectIds = alreadyBookmarked
      ? member.bookmarkedProjectIds.filter((id: string) => id !== projectId)
      : [...member.bookmarkedProjectIds, projectId]

    return cloneMember(member)
  })
}

export async function updateDefaultProjectStatusFilters(
  memberId: string,
  defaultProjectStatusFilters: NonNullable<Member['defaultProjectStatusFilters']>,
) {
  return updateStore(['members'], (store) => {
    const member = store.members.find((item) => item.id === memberId)

    if (!member) {
      throw new Error('Member not found')
    }

    member.defaultProjectStatusFilters = allWorkStatuses.filter((status) =>
      defaultProjectStatusFilters.includes(status),
    )

    return cloneMember(member)
  })
}
