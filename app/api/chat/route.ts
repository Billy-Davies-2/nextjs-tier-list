import { NextResponse } from 'next/server'
import { createChatMessage, getRecentChatMessages, devMaybePumpChat } from '@/lib/chatdb'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const userId = Number(url.searchParams.get('userId'))
  const sinceId = url.searchParams.get('sinceId') ? Number(url.searchParams.get('sinceId')) : undefined
  // In dev, pump a sample message periodically and backfill a few on first hit
  if (process.env.NODE_ENV !== 'production') {
    devMaybePumpChat(sinceId ? 0 : 8)
  }
  const messages = getRecentChatMessages(userId || 0, sinceId)
  return NextResponse.json({ ok: true, messages })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const userId = Number(body?.userId)
    const text = String(body?.text || '').trim()
    if (!userId || !text)
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    const msg = createChatMessage(userId, text)
    return NextResponse.json({ ok: true, message: msg })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
