const TIERS = ['S', 'A', 'B', 'C', 'D'] as const
import { getItemsGrouped, listUsers } from '@/lib/db'
import type { Grouped } from '@/lib/types'
import TierListClient from './tierlist.client'
import TierListShell from './tierlist.shell.client'
import UserSelector from './user-selector.client'

export default async function TierList({ searchParams }: { searchParams?: { user?: string } }) {
  const users = listUsers()
  const fallbackId = users[0]?.id
  const currentId = searchParams?.user ? Number(searchParams.user) : fallbackId
  const grouped = getItemsGrouped(currentId) as Grouped
  return <TierListShell initial={grouped} userId={currentId} users={users} />
}