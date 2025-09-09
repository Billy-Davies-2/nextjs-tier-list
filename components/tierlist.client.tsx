"use client"

import type { Grouped, Item, Tier } from '@/lib/types'
import Image from 'next/image'
import { useMemo, useRef, useState } from 'react'
import { useToast } from './toast.client'

export default function TierListClient({ initial, userId }: { initial: Grouped; userId?: number }) {
  const [grouped, setGrouped] = useState<Grouped>(initial)
  const [compact, setCompact] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [tierNames, setTierNames] = useState<Record<Tier, string>>({ S: 'S', A: 'A', B: 'B', C: 'C', D: 'D' })
  const [editingTier, setEditingTier] = useState<Tier | null>(null)
  const [tierValue, setTierValue] = useState('')

  const color: Record<Tier, string> = useMemo(
    () => ({ S: 'bg-red-500', A: 'bg-amber-500', B: 'bg-emerald-500', C: 'bg-blue-500', D: 'bg-violet-500' }),
    []
  )

  const dragOverIndex = useRef<number | null>(null)

  function onDragStart(e: React.DragEvent, item: Item) {
    e.dataTransfer.setData('text/plain', String(item.id))
  }

  function onDragOverItem(e: React.DragEvent, _tier: Tier, index: number) {
    e.preventDefault()
    dragOverIndex.current = index
  }

  function onDrop(e: React.DragEvent, tier: Tier) {
    e.preventDefault()
    const id = Number(e.dataTransfer.getData('text/plain'))
    if (!id) return

    setGrouped((g) => {
      const next: Grouped = { S: [], A: [], B: [], C: [], D: [] }
      let moving: Item | undefined
      for (const t of Object.keys(g) as Tier[]) {
        for (const it of g[t]) {
          if (it.id === id) {
            moving = { ...it, tier }
          } else {
            next[t].push(it)
          }
        }
      }
      if (moving) {
        const insertAt = dragOverIndex.current ?? next[tier].length
        next[tier].splice(Math.max(0, Math.min(insertAt, next[tier].length)), 0, moving)
      }
      return next
    })

    const current = grouped[tier].map((x) => x.id)
    const insertAt = dragOverIndex.current ?? current.length
    const arr = [...current]
    const existing = arr.indexOf(id)
    if (existing !== -1) arr.splice(existing, 1)
    arr.splice(Math.max(0, Math.min(insertAt, arr.length)), 0, id)

    fetch('/api/items', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, tier }) }).catch(() => {})
    fetch('/api/items', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier, orderedIds: arr }) }).catch(() => {})

    dragOverIndex.current = null
  }

  const tileClass = compact
    ? 'relative flex items-end justify-start w-20 h-20 md:w-24 md:h-24 p-1 rounded-md bg-neutral-800/80 border border-neutral-700 hover:border-neutral-500 cursor-move overflow-hidden'
    : 'relative flex items-end justify-start w-28 h-28 md:w-32 md:h-32 p-2 rounded-lg bg-neutral-800/80 border border-neutral-700 hover:border-neutral-500 cursor-move overflow-hidden'

  const gridCols = compact
    ? 'grid-cols-[5rem_1fr] md:grid-cols-[6rem_1fr]'
    : 'grid-cols-[7rem_1fr] md:grid-cols-[8rem_1fr]'

  return (
    <section aria-label="Tier list" className="grid gap-4 w-full max-w-5xl">
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none px-2 py-1 rounded-md bg-neutral-900/60 border border-neutral-800 shadow">
          <input type="checkbox" className="accent-blue-500" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
          <span className="text-sm text-neutral-300">Compact mode</span>
        </label>
  <AddItemForm userId={userId} onAdded={(item) => setGrouped((g) => ({ ...g, [item.tier]: [...g[item.tier], item] }))} />
      </div>

      {(Object.keys(grouped) as Tier[]).map((t) => (
  <div key={t} className={`grid ${gridCols} gap-2 items-stretch`}>
          <div
            className={`relative flex items-center justify-center font-bold rounded-md text-white px-2 py-2 text-center leading-snug break-words whitespace-pre-wrap ${color[t]}`}
            title={tierNames[t]}
            onDoubleClick={() => { setEditingTier(t); setTierValue(tierNames[t]) }}
          >
            {editingTier === t ? (
              <textarea
                autoFocus
                value={tierValue}
                onChange={(e) => {
                  setTierValue(e.target.value)
                  // auto-grow height
                  const ta = e.currentTarget
                  ta.style.height = 'auto'
                  ta.style.height = `${ta.scrollHeight}px`
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const v = tierValue.trim()
                    setTierNames((n) => ({ ...n, [t]: v || t }))
                    setEditingTier(null)
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    setEditingTier(null)
                    setTierValue('')
                  }
                }}
                onBlur={() => { const v = tierValue.trim(); setTierNames((n) => ({ ...n, [t]: v || t })); setEditingTier(null) }}
                placeholder={t}
                rows={1}
                className="w-full resize-none overflow-hidden bg-transparent text-white text-center font-bold focus:outline-none"
              />
            ) : (
              <span className="w-full block">{tierNames[t]}</span>
            )}
          </div>
          <div
            className="min-h-28 rounded-md border border-neutral-700/60 bg-neutral-900/40 p-2 flex flex-wrap gap-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, t)}
          >
            {grouped[t].map((it, idx) => (
              <div
                key={it.id}
                className={`group ${tileClass}`}
                draggable
                onDragStart={(e) => onDragStart(e, it)}
                onDragOver={(e) => onDragOverItem(e, t, idx)}
                title={it.name}
                onDoubleClick={() => setEditing(it)}
              >
                {it.image ? <Image src={it.image} alt={it.name} fill className="object-cover object-center opacity-90" /> : null}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                <span className={`relative z-10 text-white ${compact ? 'text-sm' : 'text-base'} font-semibold leading-tight bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded`}>
                  {it.name}
                </span>
                <button
                  onClick={() => setEditing(it)}
                  title="Edit"
                  className="absolute top-1 right-1 z-10 px-1.5 py-0.5 text-xs rounded bg-neutral-900/80 text-white border border-white/10 hover:bg-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Edit
                </button>
                <DeleteItemButton
                  id={it.id}
                  onDeleted={() =>
                    setGrouped((g) => {
                      const next: Grouped = { S: [], A: [], B: [], C: [], D: [] }
                      for (const tier of Object.keys(g) as Tier[]) {
                        for (const x of g[tier]) if (x.id !== it.id) next[tier].push(x)
                      }
                      return next
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Edit modal */}
      {editing ? (
        <EditItemModal
          item={editing}
          onClose={() => setEditing(null)}
          onUpdated={(updated) => {
            setGrouped((g) => {
              const next: Grouped = { S: [], A: [], B: [], C: [], D: [] }
              for (const tier of Object.keys(g) as Tier[]) {
                for (const x of g[tier]) next[tier].push(x.id === updated.id ? updated : x)
              }
              return next
            })
            setEditing(null)
          }}
          onDeleted={(id) => {
            setGrouped((g) => {
              const next: Grouped = { S: [], A: [], B: [], C: [], D: [] }
              for (const tier of Object.keys(g) as Tier[]) {
                for (const x of g[tier]) if (x.id !== id) next[tier].push(x)
              }
              return next
            })
            setEditing(null)
          }}
        />
      ) : null}
    </section>
  )
}

function AddItemForm({ onAdded, userId }: { onAdded: (item: Item) => void; userId?: number }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [image, setImage] = useState('')
  const [tier, setTier] = useState<Tier>('C')

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const fd = new FormData()
    fd.set('file', f)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const json = await res.json()
    if (json?.url) setImage(json.url)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
  const res = await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, image: image || null, tier, userId }) })
    const json = await res.json()
    if (json?.item) {
      onAdded(json.item as Item)
      setName('')
      setImage('')
      setTier('C')
    }
  }

  async function uploadBlobAsFile(blob: Blob, fallbackName = 'pasted.png') {
    const nameFromType = (() => {
      const ext = blob.type.split('/')[1] || 'png'
      return `pasted.${ext}`
    })()
    const file = new File([blob], fallbackName || nameFromType, { type: blob.type || 'image/png' })
    const fd = new FormData()
    fd.set('file', file)
    try {
      toast.push('Uploading pasted image...')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json?.url) setImage(json.url)
      toast.push('Image pasted ✓')
    } catch {
      toast.push('Upload failed')
    }
  }

  async function onPaste(e: React.ClipboardEvent<HTMLFormElement>) {
    try {
      const items = e.clipboardData?.items
      if (items && items.length) {
        for (const it of items) {
          if (it.type && it.type.startsWith('image/')) {
            const file = it.getAsFile()
            if (file) {
              e.preventDefault()
              await uploadBlobAsFile(file, 'pasted-image')
              return
            }
          }
        }
      }
      const txt = e.clipboardData?.getData('text') || ''
      if (/^data:image\//i.test(txt)) {
        e.preventDefault()
        const resp = await fetch(txt)
        const blob = await resp.blob()
        await uploadBlobAsFile(blob, 'pasted-dataurl')
        return
      }
      if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)$/i.test(txt)) {
  // Don't prevent default; let it paste into focused field too
  setImage(txt)
  toast.push('Image URL pasted')
      }
    } catch {}
  }

  return (
    <form onSubmit={submit} onPaste={onPaste} className="flex flex-wrap items-end gap-2 text-sm bg-neutral-900/60 border border-neutral-800 rounded-lg p-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-400">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500" required />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-400">Image URL</label>
        <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="/images/pikachu.png" className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-white w-56 placeholder-neutral-500" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-400">Upload</label>
  <input type="file" accept="image/*" onChange={async (e) => {
          try {
            toast.push('Uploading image...')
            await onUpload(e)
            toast.push('Upload complete ✓')
          } catch {
            toast.push('Upload failed')
          }
        }} className="text-xs text-neutral-300 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-neutral-700 file:text-white hover:file:bg-neutral-600" />
  <span className="text-[10px] text-neutral-500">Tip: Paste an image (Ctrl/Cmd+V) to upload</span>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-400">Tier</label>
        <select value={tier} onChange={(e) => setTier(e.target.value as Tier)} className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-white">
          {(['S', 'A', 'B', 'C', 'D'] as Tier[]).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
  <button type="submit" className="px-3 py-2 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50">
        Add
      </button>
    </form>
  )
}

function EditItemModal({ item, onUpdated, onDeleted, onClose }: { item: Item; onUpdated: (updated: Item) => void; onDeleted: (id: number) => void; onClose: () => void }) {
  const toast = useToast()
  const [name, setName] = useState(item.name)
  const [image, setImage] = useState(item.image ?? '')
  const [tier, setTier] = useState<Tier>(item.tier)
  const [busy, setBusy] = useState(false)

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const fd = new FormData()
    fd.set('file', f)
  toast.push('Uploading image...')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const json = await res.json()
    if (json?.url) setImage(json.url)
  toast.push('Upload complete ✓')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    await fetch('/api/items', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, name, image: image || null, tier }) }).catch(() => {})
    onUpdated({ ...item, name, image: image || null, tier })
    setBusy(false)
  }

  async function del() {
    if (busy) return
    setBusy(true)
    onDeleted(item.id)
    await fetch(`/api/items?id=${item.id}`, { method: 'DELETE' }).catch(() => {})
    setBusy(false)
  }

  async function uploadBlobAsFile(blob: Blob, fallbackName = 'pasted.png') {
    const file = new File([blob], fallbackName, { type: blob.type || 'image/png' })
    const fd = new FormData()
    fd.set('file', file)
    try {
      toast.push('Uploading pasted image...')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json?.url) setImage(json.url)
      toast.push('Image pasted ✓')
    } catch {
      toast.push('Upload failed')
    }
  }

  async function onPaste(e: React.ClipboardEvent<HTMLFormElement>) {
    try {
      const items = e.clipboardData?.items
      if (items && items.length) {
        for (const it of items) {
          if (it.type && it.type.startsWith('image/')) {
            const file = it.getAsFile()
            if (file) {
              e.preventDefault()
              await uploadBlobAsFile(file, 'pasted-image')
              return
            }
          }
        }
      }
      const txt = e.clipboardData?.getData('text') || ''
      if (/^data:image\//i.test(txt)) {
        e.preventDefault()
        const resp = await fetch(txt)
        const blob = await resp.blob()
        await uploadBlobAsFile(blob, 'pasted-dataurl')
        return
      }
      if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)$/i.test(txt)) {
  setImage(txt)
  toast.push('Image URL pasted')
      }
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} onPaste={onPaste} className="w-full max-w-md p-4 rounded-2xl border border-neutral-700 bg-neutral-900/95 shadow-2xl ring-1 ring-blue-600/20" aria-label="Edit item">
        <div className="mb-3 text-lg font-semibold text-white">Edit item</div>
        <div className="grid gap-3">
          <div>
            <label className="text-xs text-neutral-400">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="mt-1 w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white" />
          </div>
          <div>
            <label className="text-xs text-neutral-400">Image URL</label>
            <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="/images/pokemon.png" className="mt-1 w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white" />
          </div>
          <div>
            <label className="text-xs text-neutral-400">Upload</label>
            <input type="file" accept="image/*" onChange={onUpload} className="mt-1 w-full text-xs text-neutral-300 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-neutral-700 file:text-white hover:file:bg-neutral-600" />
          </div>
          <div>
            <label className="text-xs text-neutral-400">Tier</label>
            <select value={tier} onChange={(e) => setTier(e.target.value as Tier)} className="mt-1 w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white">
              {(['S', 'A', 'B', 'C', 'D'] as Tier[]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-between gap-2">
          <button type="button" onClick={del} className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white shadow focus:outline-none focus:ring-2 focus:ring-red-600/40">Delete</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-md bg-neutral-700 hover:bg-neutral-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-neutral-500/40">Cancel</button>
            <button type="submit" disabled={busy} className="px-3 py-2 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow focus:outline-none focus:ring-2 focus:ring-blue-600/50">Save</button>
          </div>
        </div>
      </form>
    </div>
  )
}

function DeleteItemButton({ id, onDeleted }: { id: number; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false)
  async function del() {
    if (busy) return
    setBusy(true)
    // Optimistic: remove locally first
    onDeleted()
    try {
      await fetch(`/api/items?id=${id}`, { method: 'DELETE' })
    } catch {
      // No rollback for simplicity
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      onClick={del}
      title="Delete"
  className="absolute top-1 left-1 z-10 px-1.5 py-0.5 text-xs rounded bg-red-600/90 text-white border border-white/10 hover:bg-red-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-600/40 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      Del
    </button>
  )
}