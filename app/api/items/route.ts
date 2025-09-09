import { NextResponse } from 'next/server'
import { deleteItem, getItemsGrouped, insertItem, reorderTier, updateItem, updateItemTier } from '@/lib/db'
import type { Tier } from '@/lib/types'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  const grouped = getItemsGrouped(userId ? Number(userId) : undefined)
  return NextResponse.json({ ok: true, grouped })
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    // Two modes: { id, tier } to move across tiers, or { tier, orderedIds } for reordering
    if (Array.isArray(body?.orderedIds)) {
      const tier = String(body?.tier) as Tier
      const orderedIds = (body.orderedIds as unknown[]).map((v) => Number(v)).filter(Boolean)
      if (!['S','A','B','C','D'].includes(tier) || orderedIds.length === 0) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
      }
      reorderTier(tier, orderedIds)
      return NextResponse.json({ ok: true })
    } else {
      const id = Number(body?.id)
      const tier = String(body?.tier) as Tier
      if (!id || !['S','A','B','C','D'].includes(tier)) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
      }
      updateItemTier(id, tier)
      return NextResponse.json({ ok: true })
    }
  } catch (e) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = String(body?.name || '').trim()
    const tier = String(body?.tier || 'C') as Tier
    const image = body?.image ? String(body.image) : null
    const userId = Number(body?.userId)
    if (!name || !['S','A','B','C','D'].includes(tier) || !userId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const created = insertItem(name, tier, image, userId)
    return NextResponse.json({ ok: true, item: created })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const id = Number(body?.id)
    const name = body?.name === undefined ? undefined : String(body.name)
    const image = body?.image === undefined ? undefined : String(body.image)
    const tier = body?.tier === undefined ? undefined : (String(body.tier) as Tier)
    if (!id) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    if (tier && !['S','A','B','C','D'].includes(tier)) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    updateItem(id, { name, image, tier })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const idParam = url.searchParams.get('id')
    const id = idParam ? Number(idParam) : Number((await req.json().catch(() => ({} as any)))?.id)
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    deleteItem(id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}