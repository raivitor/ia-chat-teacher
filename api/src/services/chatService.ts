import { pipeUIMessageStreamToResponse, streamText } from 'ai'
import { asc, eq } from 'drizzle-orm'
import type { Response } from 'express'

import { db } from '../database/client.js'
import { conversations, messages } from '../database/schema.js'
import { getChatModel } from '../lib/ai/client.js'
import { DEFAULT_GENERATION_PARAMS } from '../lib/ai/config.js'
import { loadPrompt } from '../lib/prompts/loader.js'
import type { CreateMessageInput } from '../types/message.js'

export const chatService = {
  async saveMessage(input: CreateMessageInput) {
    const now = new Date()

    const [message] = await db.transaction(async tx => {
      const [message_] = await tx
        .insert(messages)
        .values({
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          parts: input.parts ?? [],
          metadata: input.metadata ?? {},
          createdAt: now,
        })
        .returning()

      await tx.update(conversations).set({ updatedAt: now }).where(eq(conversations.id, input.conversationId))

      return [message_]
    })

    if (!message) {
      throw new Error('Failed to save message')
    }

    return message
  },

  async streamResponse(conversationId: string, userContent: string, res: Response): Promise<void> {
    // Fetch conversation
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId))

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }

    // Load history from DB
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))

    // Load system prompt
    const systemPrompt = await loadPrompt(conversation.level)

    // Save user message first
    await chatService.saveMessage({
      conversationId,
      role: 'user',
      content: userContent,
      parts: [{ type: 'text', text: userContent }],
      metadata: {},
    })

    // Build model messages from saved history + new user message
    const modelMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      { role: 'user', content: userContent },
    ]

    const model = getChatModel(conversation.model)

    const startTime = Date.now()

    const result = streamText({
      model,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: modelMessages,
      ...DEFAULT_GENERATION_PARAMS,
      providerOptions: {
        openrouter: {
          // Sticky routing: keeps requests on the same provider instance to maximize cache hits
          session_id: conversationId,
          // Prefer lowest-latency provider; allow fallback between providers for the same model
          provider: {
            sort: 'latency',
            allow_fallbacks: true,
          },
          // Disable reasoning tokens for normal chat — non-think mode reduces output tokens,
          // latency and cost
          reasoning: { effort: 'none' },
        },
      },
      onFinish: async ({ text, finishReason, usage }) => {
        const latencyMs = Date.now() - startTime

        await chatService.saveMessage({
          conversationId,
          role: 'assistant',
          content: text,
          parts: [{ type: 'text', text }],
          metadata: {
            finishReason,
            usage: {
              inputTokens: usage?.inputTokens ?? 0,
              outputTokens: usage?.outputTokens ?? 0,
              cacheReadTokens: usage?.inputTokenDetails?.cacheReadTokens ?? 0,
              cacheWriteTokens: usage?.inputTokenDetails?.cacheWriteTokens ?? 0,
            },
            latencyMs,
            model: conversation.model,
          },
        })
      },
    })

    // Stream to Express response using AI SDK helper
    pipeUIMessageStreamToResponse({
      response: res,
      stream: result.toUIMessageStream(),
      status: 200,
    })
  },
}
