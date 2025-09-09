import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'
import type { Grouped, Item, Tier, User } from './types'

const dataDir = join(process.cwd(), '.data')
try { mkdirSync(dataDir, { recursive: true }) } catch {}
const dbPath = join(dataDir, 'tierlist.sqlite')

let db: any
export function getDB() {
  if (!db) {
    db = new Database(dbPath)
    db.run(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tier TEXT NOT NULL CHECK (tier IN ('S','A','B','C','D')),
      image TEXT,
      position INTEGER,
      user_id INTEGER
    )`)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`)
    // Meta for one-time flags (e.g., seeding)
    db.run(`CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`)
    db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`)
    db.run(`CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      target_tier TEXT NOT NULL CHECK (target_tier IN ('S','A','B','C','D')),
      created_at INTEGER NOT NULL,
      UNIQUE(voter_user_id, item_id)
    )`)
    // Migrations: add columns if missing
    const cols = db.query("PRAGMA table_info('items')").all() as Array<{ name: string }>
    const names = new Set(cols.map((c) => c.name))
    if (!names.has('image')) {
      db.run('ALTER TABLE items ADD COLUMN image TEXT')
    }
    if (!names.has('position')) {
      db.run('ALTER TABLE items ADD COLUMN position INTEGER')
    }
    if (!names.has('user_id')) {
      db.run('ALTER TABLE items ADD COLUMN user_id INTEGER')
    }
    // Seed if empty (idempotent)
    // Seed at least one user
    const userCount = db.query('SELECT COUNT(*) as c FROM users').get().c as number
    if (userCount === 0) {
      db.run('INSERT INTO users (name) VALUES (?), (?), (?)', ['Ash', 'Misty', 'Brock'])
    }
    const defaultUser = db.query('SELECT id FROM users ORDER BY id LIMIT 1').get().id as number

    // Wrap initial seeding in a transaction and guard with meta flag to avoid duplicate rows on dev refresh
    const seedTx = db.transaction(() => {
      const seeded = db.query("SELECT value FROM meta WHERE key = 'seeded'").get() as { value: string } | undefined
      if (seeded) return
      const countAll = db.query('SELECT COUNT(*) as c FROM items').get().c as number
      if (countAll === 0) {
        const seed = db.query('INSERT INTO items (name, tier, image, position, user_id) VALUES (?, ?, ?, ?, ?)')
        ;[
          ['Pikachu', 'S', '/images/pikachu.png'],
          ['Charmander', 'A', '/images/charmander.png'],
          ['Bulbasaur', 'B', '/images/bulbasaur.png'],
          ['Squirtle', 'B', '/images/squirtle.png'],
          ['Jigglypuff', 'C', '/images/jigglypuff.png'],
          ['Magikarp', 'D', '/images/magikarp.png'],
        ].forEach(([name, tier, image], idx) => seed.run(name, tier, image, idx, defaultUser))
      }
      db.query("INSERT INTO meta (key, value) VALUES ('seeded','1')").run()
    })
    try { seedTx() } catch {}

    // Ensure positions are set and dense per tier
  const all = db.query('SELECT id, tier, position FROM items ORDER BY tier, position, id').all() as Array<{ id: number; tier: Tier; position: number | null }>
    const updates = db.query('UPDATE items SET position = ? WHERE id = ?')
    const positions: Record<Tier, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 }
    for (const row of all) {
      if (row.position == null || row.position < 0) {
        updates.run(positions[row.tier], row.id)
        positions[row.tier]++
      } else {
        // Normalize to dense sequence
        updates.run(positions[row.tier], row.id)
        positions[row.tier]++
      }
    }
  }
  return db
}

export function getItems(): Item[] {
  const rows = getDB().query('SELECT id, name, tier, image, position, user_id FROM items ORDER BY tier, position, id').all() as Item[]
  return rows
}

export function getItemsGrouped(userId?: number): Grouped {
  const grouped: Grouped = { S: [], A: [], B: [], C: [], D: [] }
  const rows: Item[] = userId
    ? (getDB().query('SELECT id, name, tier, image, position, user_id FROM items WHERE user_id = ? ORDER BY tier, position, id').all(userId) as Item[])
    : getItems()
  for (const it of rows) grouped[it.tier].push(it)
  return grouped
}

export function updateItemTier(id: number, tier: Tier) {
  // Move to end of target tier by assigning next position within same user
  const userRow = getDB().query('SELECT user_id FROM items WHERE id = ?').get(id) as { user_id: number }
  const next = getDB().query('SELECT COALESCE(MAX(position), -1) + 1 as nextPos FROM items WHERE tier = ? AND user_id = ?').get(tier, userRow.user_id) as { nextPos: number }
  getDB().query('UPDATE items SET tier = ?, position = ?, user_id = COALESCE(user_id, ?) WHERE id = ?').run(tier, next.nextPos, userRow.user_id, id)
}

export function reorderTier(tier: Tier, orderedIds: number[]) {
  if (orderedIds.length === 0) return
  const user = getDB().query('SELECT user_id FROM items WHERE id = ?').get(orderedIds[0]) as { user_id: number }
  const tx = getDB().transaction((ids: number[]) => {
    const stmt = getDB().query('UPDATE items SET position = ? WHERE id = ? AND tier = ? AND user_id = ?')
    ids.forEach((id, idx) => stmt.run(idx, id, tier, user.user_id))
  })
  tx(orderedIds)
}

export function insertItem(name: string, tier: Tier, image: string | null, userId: number): Item {
  const next = getDB().query('SELECT COALESCE(MAX(position), -1) + 1 as nextPos FROM items WHERE tier = ? AND user_id = ?').get(tier, userId) as { nextPos: number }
  getDB().query('INSERT INTO items (name, tier, image, position, user_id) VALUES (?, ?, ?, ?, ?)').run(name, tier, image, next.nextPos, userId)
  const row = getDB().query('SELECT id, name, tier, image, position, user_id FROM items WHERE id = last_insert_rowid()').get() as Item
  return row
}

export function updateItem(id: number, fields: Partial<Pick<Item, 'name'|'image'|'tier'>>) {
  // If tier is changing, move to end in that tier
  if (fields.tier) {
    updateItemTier(id, fields.tier)
  }
  const sets: string[] = []
  const vals: any[] = []
  if (fields.name !== undefined) { sets.push('name = ?'); vals.push(fields.name) }
  if (fields.image !== undefined) { sets.push('image = ?'); vals.push(fields.image) }
  if (sets.length) {
    vals.push(id)
    getDB().query(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  }
}

export function deleteItem(id: number) {
  // Clean up related votes, then delete the item
  const dbc = getDB()
  dbc.query('DELETE FROM votes WHERE item_id = ?').run(id)
  dbc.query('DELETE FROM items WHERE id = ?').run(id)
}

export function listUsers(): User[] {
  return getDB().query('SELECT id, name FROM users ORDER BY id').all() as User[]
}

export function ensureUser(name: string): User {
  const existing = getDB().query('SELECT id, name FROM users WHERE name = ?').get(name) as User | undefined
  if (existing) return existing
  getDB().query('INSERT INTO users (name) VALUES (?)').run(name)
  return getDB().query('SELECT id, name FROM users WHERE name = ?').get(name) as User
}

// Dev-mode chat sampler
let __dev_last_msg_at = 0
let __dev_msg_idx = 0
const __dev_samples = [
  'Wow, that placement is spicy!',
  'Move it up a tier, surely.',
  'Down to C for me.',
  'Hard S-tier. No debate.',
  'A-tier at best.',
  'B feels right.',
  'Chat, what do we think?',
  'That image is clean.',
  'We need more data.',
  'Speedrun the ranking!',
  'Based take.',
  'I disagree respectfully.',
  'Giga-brain move.',
  'Cope and seethe.',
  'W placement.',
  'L take.',
]

export function devMaybePumpChat(backfillCount = 0) {
  if (process.env.NODE_ENV === 'production') return
  try {
    // If requested, backfill a few messages when table is empty
    if (backfillCount > 0) {
      const count = (getDB().query('SELECT COUNT(*) as c FROM chat_messages').get() as { c: number }).c
      if (count === 0) {
        const users = listUsers()
        if (!users.length) return
        for (let i = 0; i < backfillCount; i++) {
          const u = users[i % users.length]
          const msg = __dev_samples[(__dev_msg_idx + i) % __dev_samples.length]
          createChatMessage(u.id, msg)
        }
        __dev_msg_idx = (__dev_msg_idx + backfillCount) % __dev_samples.length
      }
    }
    const now = Date.now()
    if (now - __dev_last_msg_at >= 1500) {
      const users = listUsers()
      if (!users.length) return
      const u = users[Math.floor(Math.random() * users.length)]
      const msg = __dev_samples[__dev_msg_idx]
      __dev_msg_idx = (__dev_msg_idx + 1) % __dev_samples.length
      createChatMessage(u.id, msg)
      __dev_last_msg_at = now
    }
  } catch {}
}

// Chat
export function createChatMessage(userId: number, text: string) {
  const ts = Date.now()
  getDB().query('INSERT INTO chat_messages (user_id, text, created_at) VALUES (?, ?, ?)').run(userId, text, ts)
  return getDB().query('SELECT id, user_id, text, created_at FROM chat_messages WHERE id = last_insert_rowid()').get() as { id: number; user_id: number; text: string; created_at: number }
}

export function getRecentChatMessages(listUserId: number, sinceId?: number, limit = 100) {
  // Only show chat for this list context (list user), i.e., messages authored by any user but scoped to this room/user
  // For simplicity, tie chat to list user id; store room in messages by overloading user_id
  const sql = sinceId
    ? 'SELECT m.id, m.user_id, u.name as user_name, m.text, m.created_at FROM chat_messages m JOIN users u ON u.id = m.user_id WHERE m.created_at IS NOT NULL AND m.id > ? ORDER BY m.id ASC LIMIT ?'
    : 'SELECT m.id, m.user_id, u.name as user_name, m.text, m.created_at FROM chat_messages m JOIN users u ON u.id = m.user_id ORDER BY m.id DESC LIMIT ?'
  const rows = sinceId
    ? (getDB().query(sql).all(sinceId, limit) as Array<{ id: number; user_id: number; user_name: string; text: string; created_at: number }>)
    : (getDB().query(sql).all(limit) as Array<{ id: number; user_id: number; user_name: string; text: string; created_at: number }>)
  return sinceId ? rows : rows.reverse()
}

// Votes
export function upsertVote(voterUserId: number, itemId: number, target: Tier) {
  const ts = Date.now()
  getDB().query(`INSERT INTO votes (voter_user_id, item_id, target_tier, created_at)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(voter_user_id, item_id) DO UPDATE SET target_tier = excluded.target_tier, created_at = excluded.created_at`)
    .run(voterUserId, itemId, target, ts)
}

export function getVotesAggregateForList(listUserId: number) {
  const sql = `SELECT v.item_id as itemId, v.target_tier as targetTier, COUNT(*) as count
               FROM votes v
               JOIN items i ON i.id = v.item_id
               WHERE i.user_id = ?
               GROUP BY v.item_id, v.target_tier`
  const rows = getDB().query(sql).all(listUserId) as Array<{ itemId: number; targetTier: Tier; count: number }>
  const byItem: Record<number, Partial<Record<Tier, number>>> = {}
  for (const r of rows) {
    byItem[r.itemId] ||= {}
    byItem[r.itemId][r.targetTier] = r.count
  }
  return byItem
}