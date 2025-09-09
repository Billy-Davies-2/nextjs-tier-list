import { NextResponse } from 'next/server'
import { join } from 'node:path'
import { createReadStream, existsSync, statSync } from 'node:fs'

export async function GET(_: Request, { params }: any) {
  // Only allow this in development for convenience
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const rel = params.path.join('/')
  const file = join(process.cwd(), '.data', 'images', rel)
  if (!existsSync(file) || !statSync(file).isFile()) {
    // Fallback: serve a placeholder SVG with the file name
    const name = rel.split('/').pop() || 'image'
    const label = name.replace(/\.[a-zA-Z0-9]+$/, '')
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#1f2937"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#e5e7eb">${label}</text>
</svg>`
    return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' } })
  }
  const ext = rel.split('.').pop() || 'png'
  const type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : 'image/png'
  const stream = createReadStream(file)
  return new NextResponse(stream as any, { headers: { 'Content-Type': type } })
}