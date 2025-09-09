"use client"

import type { User } from '@/lib/types'
import { useRouter, useSearchParams } from 'next/navigation'

export default function UserSelector({ users, currentId }: { users: User[]; currentId?: number }) {
  const router = useRouter()
  const search = useSearchParams()
  const value = currentId ?? users[0]?.id

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    const params = new URLSearchParams(search.toString())
    if (id) params.set('user', id)
    else params.delete('user')
    router.push('?' + params.toString())
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-neutral-400">User</label>
      <select value={String(value ?? '')} onChange={onChange} className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-white">
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  )
}
