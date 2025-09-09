import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'
import { listUsers } from './db'

const dataDir = join(process.cwd(), '.data')
try { mkdirSync(dataDir, { recursive: true }) } catch {}
const chatPath = join(dataDir, 'chat.sqlite')

let chatdb: any
export function getChatDB() {
  if (!chatdb) {
    chatdb = new Database(chatPath)
    chatdb.run(`CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`)
  }
  return chatdb
}

export function createChatMessage(userId: number, text: string) {
  const ts = Date.now()
  getChatDB().query('INSERT INTO chat_messages (user_id, text, created_at) VALUES (?, ?, ?)').run(userId, text, ts)
  return getChatDB().query('SELECT id, user_id, text, created_at FROM chat_messages WHERE id = last_insert_rowid()').get() as { id: number; user_id: number; text: string; created_at: number }
}

export function getRecentChatMessages(_listUserId: number, sinceId?: number, limit = 100) {
  const sql = sinceId
    ? 'SELECT m.id, m.user_id, m.text, m.created_at FROM chat_messages m WHERE m.id > ? ORDER BY m.id ASC LIMIT ?'
    : 'SELECT m.id, m.user_id, m.text, m.created_at FROM chat_messages m ORDER BY m.id DESC LIMIT ?'
  const rows = sinceId
    ? (getChatDB().query(sql).all(sinceId, limit) as Array<{ id: number; user_id: number; text: string; created_at: number }>)
    : (getChatDB().query(sql).all(limit) as Array<{ id: number; user_id: number; text: string; created_at: number }>)
  return sinceId ? rows : rows.reverse()
}

// Dev-mode chat sampler
let __dev_last_msg_at = 0
let __dev_msg_idx = 0
const __dev_samples = [
  'Wow, that placement is spicy! 🔥',
  'Move it up a tier, surely. ⬆️',
  'Down to C for me. ⬇️',
  'Hard S-tier. No debate. 💯',
  'A-tier at best. 😌',
  'B feels right. 👍',
  'Chat, what do we think? 🤔',
  'That image is clean. ✨',
  'We need more data. 📊',
  'Speedrun the ranking! 🏃‍♂️💨',
  'Based take. 🙌',
  'I disagree respectfully. 🙇',
  'Giga-brain move. 🧠',
  'Cope and seethe. 😤',
  'W placement. 🏆',
  'L take. 😬',
]

export function devMaybePumpChat(backfillCount = 0) {
  if (process.env.NODE_ENV === 'production') return
  try {
    // If requested, backfill a few messages when table is empty
    if (backfillCount > 0) {
      const count = (getChatDB().query('SELECT COUNT(*) as c FROM chat_messages').get() as { c: number }).c
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
