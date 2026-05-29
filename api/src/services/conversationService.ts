import { asc, desc, eq, sql } from 'drizzle-orm'

import { db } from '../database/client.js'
import { conversations, conversationSeq, messages } from '../database/schema.js'
import { DEFAULT_MODEL } from '../lib/ai/config.js'
import type { CreateConversationInput } from '../types/conversation.js'
import { isValidLevel } from '../types/level.js'

function formatTitle(seq: number, date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `Conversa ${seq} - ${day}/${month} - ${hours}:${minutes}`
}

export const conversationService = {
  async createConversation(input: CreateConversationInput) {
    if (!isValidLevel(input.level)) {
      throw new Error(`Invalid level: "${input.level}". Must be one of A1, A2, B1, B2, C1, C2.`)
    }

    const now = new Date()

    const [conversation] = await db.transaction(async tx => {
      const seqResult = await tx.execute(
        sql`SELECT nextval(${conversationSeq.seqName}::regclass) AS seq`,
      )
      const seq = Number((seqResult.rows[0] as { seq: string | number }).seq)
      const title = formatTitle(seq, now)

      return tx
        .insert(conversations)
        .values({
          seq,
          level: input.level,
          model: DEFAULT_MODEL,
          title,
          metadata: input.metadata ?? {},
          createdAt: now,
          updatedAt: now,
        })
        .returning()
    })

    if (!conversation) {
      throw new Error('Failed to create conversation')
    }

    return conversation
  },

  async listConversations() {
    return db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.createdAt), desc(conversations.seq))
  },

  async getConversation(id: string) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id))

    if (!conversation) {
      return null
    }

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt))

    return { ...conversation, messages: conversationMessages }
  },

  async deleteConversation(id: string) {
    const [deleted] = await db
      .delete(conversations)
      .where(eq(conversations.id, id))
      .returning({ id: conversations.id })
    return deleted ?? null
  },
}
