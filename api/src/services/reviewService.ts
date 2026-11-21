import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { generateText, Output } from 'ai'
import { and, asc, count, eq, exists, inArray, isNotNull, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../database/client.js'
import { conversations, messages } from '../database/schema.js'
import { getChatModel } from '../lib/ai/client.js'
import { DEFAULT_MODEL, FALLBACK_MODEL } from '../lib/ai/config.js'
import { buildOpenRouterProviderOptions } from '../lib/ai/openrouterOptions.js'
import { mapLanguageModelUsage } from '../lib/ai/usageMetadata.js'
import { logger } from '../lib/observability/logger.js'

const ankiCardSchema = z.object({
  cards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
      tags: z.array(z.string()),
    }),
  ),
})

export type AnkiCard = z.infer<typeof ankiCardSchema>['cards'][number]

function escapeCsvField(value: string): string {
  const needsQuoting = value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r')
  if (!needsQuoting) return value
  return `"${value.replaceAll('"', '""')}"`
}

export function deduplicateCards(cards: ReadonlyArray<AnkiCard>): AnkiCard[] {
  const seen = new Set<string>()
  const unique: AnkiCard[] = []

  for (const card of cards) {
    const key = card.front.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(card)
  }

  return unique
}

export function buildCsv(cards: ReadonlyArray<AnkiCard>): string {
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

function unreviewedConversationFilter() {
  return and(
    isNotNull(conversations.finishedAt),
    isNull(conversations.reviewedAt),
    exists(
      db
        .select({ id: messages.id })
        .from(messages)
        .where(and(eq(messages.conversationId, conversations.id), inArray(messages.role, ['user', 'assistant']))),
    ),
  )
}

export const reviewService = {
  async countUnreviewed(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(conversations).where(unreviewedConversationFilter())
    return result?.count ?? 0
  },

  async generateReview(): Promise<string> {
    const unreviewed = await db.select().from(conversations).where(unreviewedConversationFilter())

    if (unreviewed.length === 0) {
      return buildCsv([])
    }

    const promptPath = path.join(process.cwd(), 'prompts', 'review', 'anki-extraction.md')
    const systemPrompt = await readFile(promptPath, 'utf8')

    const allCards: AnkiCard[] = []
    const reviewedIds: string[] = []
    let failedCount = 0

    for (const conversation of unreviewed) {
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(asc(messages.createdAt))

      const conversationText = conversationMessages
        .filter(message => message.role === 'user' || message.role === 'assistant')
        .map(message => `${message.role === 'user' ? 'Student' : 'Coach'}: ${message.content}`)
        .join('\n\n')

      if (!conversationText.trim()) continue

      const startTime = Date.now()
      try {
        const { output, totalUsage } = await generateText({
          model: getChatModel(DEFAULT_MODEL),
          output: Output.object({ schema: ankiCardSchema }),
          system: systemPrompt,
          prompt: conversationText,
          providerOptions: buildOpenRouterProviderOptions({
            conversationId: conversation.id,
            primaryModel: DEFAULT_MODEL,
            fallbackModel: FALLBACK_MODEL,
            includeUsage: true,
          }),
        })

        allCards.push(...output.cards)
        reviewedIds.push(conversation.id)

        logger.info('review.extraction.finish', {
          conversationId: conversation.id,
          cardCount: output.cards.length,
          latencyMs: Date.now() - startTime,
          ...mapLanguageModelUsage(totalUsage),
        })
      } catch (error) {
        failedCount += 1
        logger.error('review.extraction.error', {
          conversationId: conversation.id,
          latencyMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (reviewedIds.length === 0 && failedCount > 0) {
      throw new Error('Failed to extract review cards from conversations')
    }

    if (reviewedIds.length > 0) {
      await db.update(conversations).set({ reviewedAt: new Date() }).where(inArray(conversations.id, reviewedIds))
    }

    return buildCsv(deduplicateCards(allCards))
  },
}
