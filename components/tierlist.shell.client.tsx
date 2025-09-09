"use client"

import type { Grouped, Item, User } from '@/lib/types'
import { useMemo, useState } from 'react'
import TierListClient from './tierlist.client'
import ChatPane from './chat-pane.client'

export default function TierListShell({ initial, userId, users }: { initial: Grouped; userId?: number; users: User[] }) {
  const [chatOpen, setChatOpen] = useState(true)
  const itemsById = useMemo(() => {
    const m: Record<number, Item> = {}
    for (const arr of Object.values(initial)) for (const it of arr) m[it.id] = it
    return m
  }, [initial])

  return (
    <div className={`w-full transition-[padding] duration-300 ${chatOpen ? 'pr-[328px] md:pr-[368px] lg:pr-[408px]' : 'pr-0'}`}>
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-700 bg-gradient-to-br from-neutral-900 to-neutral-800 text-white shadow-sm hover:from-neutral-800 hover:to-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
          title={chatOpen ? 'Hide chat' : 'Show chat'}
        >
          {chatOpen ? 'Hide Chat' : 'Show Chat'}
        </button>
      </div>
      <TierListClient initial={initial} userId={userId} />
      {userId ? (
        <ChatPane userId={userId} users={users} itemsById={itemsById} open={chatOpen} onOpenChange={setChatOpen} />
      ) : null}
    </div>
  )
}
