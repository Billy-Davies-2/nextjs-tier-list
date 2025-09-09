"use client"

import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/server/trpc'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRef } from 'react'
import { httpBatchLink } from '@trpc/client'

export const trpc = createTRPCReact<AppRouter>()

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const queryClientRef = useRef(new QueryClient())
  const trpcClientRef = useRef(
    trpc.createClient({
      links: [
        httpBatchLink({ url: '/api/trpc' }),
      ],
    })
  )
  return (
  <trpc.Provider client={trpcClientRef.current} queryClient={queryClientRef.current}>
      <QueryClientProvider client={queryClientRef.current}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
