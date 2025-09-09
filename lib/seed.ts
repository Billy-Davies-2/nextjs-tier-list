import { mkdirSync, existsSync, cpSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { Database } from 'bun:sqlite'

// Tiny 1x1 transparent PNG placeholder
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zz7cAAAAASUVORK5CYII='

export type SeedResult = {
  root: string
  dbPath: string
  publicImagesDir: string
  createdImages: string[]
}

const SAMPLE_ITEMS: Array<{ name: string; tier: 'S' | 'A' | 'B' | 'C' | 'D'; image: string }> = [
  { name: 'Pikachu', tier: 'S', image: '/images/pikachu.png' },
  { name: 'Charmander', tier: 'A', image: '/images/charmander.png' },
  { name: 'Bulbasaur', tier: 'B', image: '/images/bulbasaur.png' },
  { name: 'Squirtle', tier: 'B', image: '/images/squirtle.png' },
  { name: 'Jigglypuff', tier: 'C', image: '/images/jigglypuff.png' },
  { name: 'Magikarp', tier: 'D', image: '/images/magikarp.png' },
]

function ensureDir(p: string) {
  mkdirSync(p, { recursive: true })
}

function writePlaceholderPng(filePath: string) {
  ensureDir(dirname(filePath))
  const buf = Buffer.from(PLACEHOLDER_PNG_BASE64, 'base64')
  writeFileSync(filePath, buf, { flag: 'wx' })
}

export function runSeed(root = process.cwd()): SeedResult {
  const dataDir = join(root, '.data')
  ensureDir(dataDir)
  const dbPath = join(dataDir, 'tierlist.sqlite')
  const db = new Database(dbPath)

  // Recreate schema
  db.run('DROP TABLE IF EXISTS items')
  db.run('DROP TABLE IF EXISTS users')
  db.run(`CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('S','A','B','C','D')),
    image TEXT,
    position INTEGER,
    user_id INTEGER
  )`)
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`)
  db.run(`INSERT INTO users (name) VALUES ('Ash'), ('Misty'), ('Brock')`)
  const firstUser = db.query('SELECT id FROM users ORDER BY id LIMIT 1').get() as { id: number }
  const defaultUser = firstUser.id

  const seed = db.query('INSERT INTO items (name, tier, image, position, user_id) VALUES (?, ?, ?, ?, ?)')
  SAMPLE_ITEMS.forEach((it, idx) => seed.run(it.name, it.tier, it.image, idx, defaultUser))

  // Copy any dev images into public/images for convenience if directory exists
  const src = join(root, '.data', 'images')
  const dest = join(root, 'public', 'images')
  const createdImages: string[] = []
  try {
    if (existsSync(src)) {
      ensureDir(dest)
      cpSync(src, dest, { recursive: true, force: false })
    }
  } catch {}

  // Ensure placeholders exist for sample item images if missing
  for (const it of SAMPLE_ITEMS) {
    const fname = it.image.replace('/images/', '')
    const out = join(dest, fname)
    try {
      if (!existsSync(out)) {
        ensureDir(dest)
        writePlaceholderPng(out)
        createdImages.push(out)
      }
    } catch {}
  }

  return { root, dbPath, publicImagesDir: dest, createdImages }
}

// Convenience for tests
export function runSeedInTempDir(tmpRoot: string): SeedResult {
  try {
    rmSync(join(tmpRoot, '.data'), { recursive: true, force: true })
    rmSync(join(tmpRoot, 'public'), { recursive: true, force: true })
  } catch {}
  return runSeed(tmpRoot)
}
