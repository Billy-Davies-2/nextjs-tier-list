"use client"

import { useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { trpc } from '@/lib/trpc'
import type { Grouped, Item, Tier, User } from '@/lib/types'

export default function ChatPane({ userId, users, itemsById, open, onOpenChange }: { userId: number; users: User[]; itemsById: Record<number, Item>; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [messages, setMessages] = useState<Array<{ id: number; user_id: number; user_name?: string; text: string; created_at: number }>>([])
  const [text, setText] = useState('')
  const lastIdRef = useRef<number | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [hot, setHot] = useState(false)
  const pickerRef = useRef<{ close: () => void } | null>(null)

  // Poll for new messages via tRPC
  const listQuery = trpc.chat.list.useQuery(
    { userId, sinceId: lastIdRef.current },
    {
      refetchInterval: 1500,
      refetchOnWindowFocus: false,
    }
  )

  useEffect(() => {
    const data = listQuery.data
    if (!data?.length) return
    setMessages((prev) => {
      const merged = [...prev, ...data]
      lastIdRef.current = merged[merged.length - 1].id
      return merged
    })
    queueMicrotask(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listQuery.data])

  const sendMutation = trpc.chat.send.useMutation()

  async function send() {
    const author = userId || users[0]?.id
    if (!author || !text.trim()) return
    const prev = text
    setText('')
    // Optimistic local append with a temp id
    const temp = { id: (lastIdRef.current ?? 0) + 0.1, user_id: author, text: prev, created_at: Date.now() }
    setMessages((m) => [...m, temp as any])
    queueMicrotask(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
    try {
      const saved = await sendMutation.mutateAsync({ userId: author, text: prev })
      setMessages((m) => m.map((x) => (x.id === temp.id ? (saved as any) : x)))
      lastIdRef.current = (saved as any).id
    } catch {
      // rollback on failure
      setMessages((m) => m.filter((x) => x.id !== temp.id))
      setText(prev)
    }
  }

  const voteMutation = trpc.votes.cast.useMutation()
  const vote = async (itemId: number, targetTier: Tier) => {
    if (!userId) return
    voteMutation.mutate({ userId, itemId, targetTier })
  }

  // Emotes: naive shortcode replacement and a tiny picker
  const EMOTES: Record<string, string> = useMemo(
    () => ({
      ':smile:': '😄',
      ':sad:': '😢',
      ':heart:': '❤️',
      ':fire:': '🔥',
      ':100:': '💯',
      ':pog:': '😲',
      ':clap:': '👏',
      ':thumbsup:': '👍',
      ':party:': '🎉',
    }),
    []
  )

  const renderText = (t: string) => {
    let out = t
    for (const [code, char] of Object.entries(EMOTES)) {
      out = out.split(code).join(char)
    }
    return out
  }

  // Smooth focus: if mouse is near the right edge (chat), open and focus chat
  useEffect(() => {
    let raf = 0
    const proximity = 120 // px from right edge
    const onMove = (e: MouseEvent) => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const nearRight = window.innerWidth - e.clientX <= proximity
        setHot(nearRight)
        if (nearRight) {
          if (!open) onOpenChange?.(true)
          // Focus input when visible
          setTimeout(() => inputRef.current?.focus(), 0)
        }
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [open, onOpenChange])

  // Global type-to-chat: if not typing in an input/textarea/contenteditable, route keystrokes to chat
  useEffect(() => {
    const isTypingTarget = (el: Element | null) => {
      if (!el) return false
      const tag = (el as HTMLElement).tagName?.toLowerCase()
      const editable = (el as HTMLElement).getAttribute?.('contenteditable') === 'true'
      return tag === 'input' || tag === 'textarea' || editable
    }
    const isEditingActive = () => {
      // Heuristic: if any modal/dialog is open, don't hijack typing
      return !!document.querySelector('[role="dialog"], [aria-modal="true"]')
    }
    const onKeyDown = (e: KeyboardEvent) => {
      // ignore with modifiers
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const ae = document.activeElement
      if (isTypingTarget(ae) || isEditingActive()) return
      // Open chat if closed
      if (!open) onOpenChange?.(true)
      // Route to input
      inputRef.current?.focus()
      if (e.key.length === 1) {
        e.preventDefault()
        setText((t) => t + e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        setText((t) => t.slice(0, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        pickerRef.current?.close?.()
        // Send if we have content
        setTimeout(() => send(), 0)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onOpenChange, send])

  return (
  <div className={`fixed top-0 right-0 h-screen w-[340px] md:w-[360px] lg:w-[400px] ml-2 border-l ${hot ? 'border-indigo-500' : 'border-neutral-800'} bg-neutral-950 text-white shadow-xl transition-transform will-change-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col">
    <div className="p-3 border-b border-neutral-800 font-semibold">Chat</div>
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 pb-16">
      {messages.map((m) => (
            <div key={m.id} className="text-sm">
              <span className="text-blue-400 font-medium">{m.user_name ?? `User ${m.user_id}`}:</span>{' '}
        <span className="text-neutral-200 break-words">{renderText(m.text)}</span>
            </div>
          ))}
        </div>
  <div className="p-3 border-t border-neutral-800 space-y-2">
          <div className="flex gap-2">
    <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { pickerRef.current?.close?.(); send() } }} placeholder="Send a message" className="flex-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 placeholder-neutral-500" />
  <EmotePicker ref={pickerRef} onPick={(e) => setText((t) => `${t} ${e}`.trim())} />
      <button onClick={send} className="px-3 py-1 rounded bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow">Send</button>
          </div>
          <div className="text-xs text-neutral-400">Vote to move an item:</div>
          <VoteQuick itemsById={itemsById} onVote={vote} />
        </div>
      </div>
    </div>
  )
}

type EmotePickerHandle = { close: () => void }
const EmotePicker = forwardRef<EmotePickerHandle, { onPick: (emoji: string) => void }>(function EmotePicker({ onPick }, ref) {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(true) // keep open by default per request
  const [tab, setTab] = useState<'faces'|'hands'|'symbols'|'animals'>('faces')
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  useImperativeHandle(ref, () => ({ close: () => setOpen(false) }), [])
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!pinned && open) {
        const el = rootRef.current
        if (el && !el.contains(e.target as Node)) setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, pinned])
  const CATS: Record<typeof tab, string[]> = {
    faces: ['�','😃','�😄','�','😆','😅','😂','🤣','🙂','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥳','😤','�😢','😭','😡','🤯','😲','😴','🤤'],
    hands: ['👍','👎','👏','🙌','👌','✌️','🤞','🤟','👊','🤝','🙏','💪'],
    symbols: ['❤️','🧡','�','�','�','�','�','🤍','🤎','💯','🔥','✨','⭐','�','⚡','❗','❓','✅','❌','�🎉','🏆'],
    animals: ['�','�','🐭','🐹','🐰','�','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵']
  }
  const EMOJIS = CATS[tab]
  const filtered = q ? EMOJIS.filter((e) => e.includes(q)) : EMOJIS
  return (
    <div className="relative" ref={rootRef}>
      <button onClick={() => setOpen((v) => !v)} title="Emotes" className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 hover:bg-neutral-700">:)</button>
      {open ? (
        <div className="absolute bottom-full mb-2 right-0 w-72 rounded-md bg-neutral-900 border border-neutral-700 shadow-lg select-none">
          <div className="p-2 border-b border-neutral-800 flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="flex-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm" />
            <div className="flex gap-1 text-xs items-center">
              <button onClick={() => setPinned((v) => !v)} title={pinned? 'Unpin (close on click-outside)' : 'Pin (keep open)'} className={`px-2 py-1 rounded ${pinned?'bg-indigo-600 hover:bg-indigo-500':'bg-neutral-800 hover:bg-neutral-700'} border border-neutral-700`}>{pinned? 'Pinned' : 'Pin'}</button>
              <button onClick={() => setOpen(false)} className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700">Close</button>
            </div>
          </div>
          <div className="px-2 py-1 flex gap-1 text-xs border-b border-neutral-800">
            {(['faces','hands','symbols','animals'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-2 py-1 rounded ${tab===t?'bg-neutral-700':'bg-neutral-800 hover:bg-neutral-700'} border border-neutral-700`}>{t[0].toUpperCase()+t.slice(1)}</button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-1 p-2 max-h-48 overflow-auto">
            {filtered.map((e) => (
              <button key={e} onClick={() => { onPick(e); if (!pinned) setOpen(false) }} onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); setOpen(false) } }} className="h-8 w-8 rounded hover:bg-neutral-800 text-lg">
                {e}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
})

function VoteQuick({ itemsById, onVote }: { itemsById: Record<number, Item>; onVote: (itemId: number, target: Tier) => void }) {
  const items = Object.values(itemsById)
  const [item, setItem] = useState<number>(items[0]?.id ?? 0)
  const [tier, setTier] = useState<Tier>('C')
  return (
    <div className="flex items-center gap-2">
      <select value={item} onChange={(e) => setItem(Number(e.target.value))} className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">
        {items.map((i) => (
          <option key={i.id} value={i.id}>{i.name}</option>
        ))}
      </select>
      <select value={tier} onChange={(e) => setTier(e.target.value as Tier)} className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">
        {(['S','A','B','C','D'] as Tier[]).map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <button onClick={() => onVote(item, tier)} className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white">Vote</button>
    </div>
  )
}
