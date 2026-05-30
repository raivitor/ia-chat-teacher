import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { generateObject } from 'ai'
import { asc, count, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../database/client.js'
import { conversations, messages } from '../database/schema.js'
import { getChatModel } from '../lib/ai/client.js'

const ankiCardSchema = z.object({
  cards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
      tags: z.array(z.string()),
    }),
  ),
})

type AnkiCard = z.infer<typeof ankiCardSchema>['cards'][number]

function escapeCsvField(value: string): string {
  const needsQuoting = value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r')
  if (!needsQuoting) return value
  return `"${value.replaceAll('"', '""')}"`
}

function buildCsv(cards: AnkiCard[]): string {
  const header = ['#separator:semicolon', '#html:true', '#deck:English Coach - Revisão', '#notetype:Basic'].join('\n')

  if (cards.length === 0) return header

  const rows = cards.map(card => {
    const front = escapeCsvField(card.front)
    const back = escapeCsvField(card.back)
    const tags = escapeCsvField(card.tags.join(' '))
    return `${front};${back};${tags}`
  })

  return [header, ...rows].join('\n')
}

export const reviewService = {
  async countUnreviewed(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(conversations).where(isNull(conversations.reviewedAt))
    return result?.count ?? 0
  },

  async generateReview(): Promise<string> {
    const unreviewed = await db.select().from(conversations).where(isNull(conversations.reviewedAt))

    if (unreviewed.length === 0) {
      return buildCsv([])
    }

    const promptPath = path.join(process.cwd(), 'prompts', 'review', 'anki-extraction.md')
    const systemPrompt = await readFile(promptPath, 'utf8')

    const allCards: AnkiCard[] = []

    for (const conv of unreviewed) {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(asc(messages.createdAt))

      const conversationText = msgs
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.content}`)
        .join('\n\n')

      if (!conversationText.trim()) continue

      const { object } = await generateObject({
        model: getChatModel(),
        schema: ankiCardSchema,
        system: systemPrompt,
        prompt: conversationText,
      })

      allCards.push(...object.cards)
    }

    // Mark all processed conversations as reviewed atomically
    const ids = unreviewed.map(c => c.id)
    await db.update(conversations).set({ reviewedAt: new Date() }).where(inArray(conversations.id, ids))

    return buildCsv(allCards)
  },
}
