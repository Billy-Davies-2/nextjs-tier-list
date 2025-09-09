import { NextResponse } from 'next/server'
import { getVotesAggregateForList, upsertVote } from '@/lib/db'
import type { Tier } from '@/lib/types'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const listUserId = Number(url.searchParams.get('userId'))
  if (!listUserId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  const agg = getVotesAggregateForList(listUserId)
  return NextResponse.json({ ok: true, votes: agg })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const voterUserId = Number(body?.userId)
    const itemId = Number(body?.itemId)
    const target = String(body?.targetTier) as Tier
    if (!voterUserId || !itemId || !['S','A','B','C','D'].includes(target)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    upsertVote(voterUserId, itemId, target)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
