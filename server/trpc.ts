import { initTRPC } from '@trpc/server'
import { z } from 'zod'

const t = initTRPC.create()
export const router = t.router
export const publicProcedure = t.procedure

export type Context = {}

import { getVotesAggregateForList, upsertVote } from '@/lib/db'
import { createChatMessage, devMaybePumpChat, getRecentChatMessages } from '@/lib/chatdb'

export const appRouter = router({
  chat: router({
    list: publicProcedure.input(z.object({ userId: z.number(), sinceId: z.number().optional() })).query(({ input }) => {
      if (process.env.NODE_ENV !== 'production') devMaybePumpChat(input.sinceId ? 0 : 8)
      return getRecentChatMessages(input.userId, input.sinceId)
    }),
    send: publicProcedure.input(z.object({ userId: z.number(), text: z.string().min(1) })).mutation(({ input }) => {
      return createChatMessage(input.userId, input.text)
    }),
  }),
  votes: router({
    list: publicProcedure.input(z.object({ userId: z.number() })).query(({ input }) => {
      return getVotesAggregateForList(input.userId)
    }),
    cast: publicProcedure.input(z.object({ userId: z.number(), itemId: z.number(), targetTier: z.enum(['S','A','B','C','D']) })).mutation(({ input }) => {
      upsertVote(input.userId, input.itemId, input.targetTier)
      return { ok: true }
    }),
  }),
})

export type AppRouter = typeof appRouter
