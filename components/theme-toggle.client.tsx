"use client"

import { useEffect, useState } from 'react'

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark'
    const saved = (localStorage.getItem('theme') as 'light' | 'dark' | null) ?? null
    return saved ?? 'dark'
  })

  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
  className="fixed bottom-3 left-3 z-50 rounded-md border border-neutral-700 bg-gradient-to-br from-neutral-900 to-neutral-800 text-white px-3 py-2 text-sm shadow-sm hover:from-neutral-800 hover:to-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
    >
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  )
}
