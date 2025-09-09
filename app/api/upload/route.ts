import { NextResponse } from 'next/server'
import { mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const dataDir = join(process.cwd(), '.data', 'images')
    mkdirSync(dataDir, { recursive: true })
    const ext = extname(file.name || '').toLowerCase() || '.png'
    const id = crypto.randomUUID().replace(/-/g, '')
    const filename = `${id}${ext}`
    const filepath = join(dataDir, filename)

    const ab = await file.arrayBuffer()
    await Bun.write(filepath, new Uint8Array(ab))

    // In dev, /images/* is served from .data/images via route; in prod, consider copying to public/images
    return NextResponse.json({ ok: true, url: `/images/${filename}`, name: filename })
  } catch (e) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}