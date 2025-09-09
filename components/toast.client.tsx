"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

type Toast = { id: number; message: string; duration: number }

const ToastCtx = createContext<{ push: (msg: string, duration?: number) => void } | null>(null)

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Toast[]>([])
  const timers = useRef<Map<number, any>>(new Map())

  const remove = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) {
      clearTimeout(t)
      timers.current.delete(id)
    }
    setList((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const push = useCallback((message: string, duration = 10000) => {
    setList((prev) => {
      const id = (prev[prev.length - 1]?.id ?? 0) + 1
      const next = [...prev, { id, message, duration }]
      // schedule removal
      const handle = setTimeout(() => remove(id), duration)
      timers.current.set(id, handle)
      return next
    })
  }, [remove])

  useEffect(() => {
    return () => {
      // cleanup all timers on unmount
      for (const h of timers.current.values()) clearTimeout(h)
      timers.current.clear()
    }
  }, [])

  const api = useMemo(() => ({ push }), [push])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* Toast viewport */}
      <div className="pointer-events-none fixed z-[200] bottom-4 left-1/2 -translate-x-1/2 space-y-2 w-[calc(100%-2rem)] max-w-md">
        {list.map((t) => (
          <div key={t.id} className="relative pointer-events-auto flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-neutral-900/95 border border-neutral-700 text-white shadow-lg overflow-hidden">
            <span className="text-sm">{t.message}</span>
            <button onClick={() => remove(t.id)} className="px-2 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600">
              Close
            </button>
            {/* progress bar */}
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-blue-500"
              style={{
                animationName: 'toast-progress',
                animationDuration: `${t.duration}ms`,
                animationTimingFunction: 'linear',
                animationFillMode: 'forwards',
              }}
            />
          </div>
        ))}
      </div>
      {/* progress keyframes */}
      <style jsx global>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastCtx.Provider>
  )
}
