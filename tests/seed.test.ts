import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSeedInTempDir } from '../lib/seed'
import { Database } from 'bun:sqlite'
import { test, expect } from 'bun:test'

function tmpWorkspace() {
  const dir = mkdtempSync(join(tmpdir(), 'tierlist-'))
  return dir
}

test('runSeed creates DB with items and users and pre-seeds images', () => {
  const root = tmpWorkspace()
  const result = runSeedInTempDir(root)
  // Check DB tables and counts
  const db = new Database(result.dbPath)
  const itemCount = db.query('SELECT COUNT(*) AS c FROM items').get() as { c: number }
  const userCount = db.query('SELECT COUNT(*) AS c FROM users').get() as { c: number }
  expect(itemCount.c).toBeGreaterThanOrEqual(6)
  expect(userCount.c).toBeGreaterThanOrEqual(3)

  // Check public/images contains expected files
  const expected = ['pikachu.png', 'charmander.png', 'bulbasaur.png', 'squirtle.png', 'jigglypuff.png', 'magikarp.png']
  for (const f of expected) {
    const p = join(result.publicImagesDir, f)
    expect(existsSync(p)).toBe(true)
    const bytes = readFileSync(p)
    expect(bytes.length).toBeGreaterThan(0)
  }

  // Cleanup
  rmSync(root, { recursive: true, force: true })
})
