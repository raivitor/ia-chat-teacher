import { pipeUIMessageStreamToResponse, streamText } from 'ai'
import { asc, eq } from 'drizzle-orm'
import type { Response } from 'express'

import { db } from '../database/client.js'
import { conversations, messages } from '../database/schema.js'
import { getChatModel } from '../lib/ai/client.js'
import { DEFAULT_GENERATION_PARAMS, FALLBACK_MODEL } from '../lib/ai/config.js'
import { buildOpenRouterProviderOptions } from '../lib/ai/openrouterOptions.js'
import { webSearchTool } from '../lib/ai/tools/webSearch.js'
import { mapLanguageModelUsage } from '../lib/ai/usageMetadata.js'
import { logger } from '../lib/observability/logger.js'
import { loadPrompt } from '../lib/prompts/loader.js'
import type { CreateMessageInput } from '../types/message.js'

const NORMAL_FINISH_REASONS = new Set(['stop'])

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
    const systemPrompt = await loadPrompt(conversation.level, conversation.profile)

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

    const requestedModel = conversation.model
    const model = getChatModel(requestedModel)
    const providerOptions = buildOpenRouterProviderOptions({
      conversationId,
      primaryModel: requestedModel,
      fallbackModel: FALLBACK_MODEL,
      includeUsage: true,
    })

    const startTime = Date.now()
    let ttftMs: number | undefined

    const tools = conversation.webSearchEnabled ? { webSearch: webSearchTool } : undefined

    const result = streamText({
      model,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: modelMessages,
      ...DEFAULT_GENERATION_PARAMS,
      ...(tools ? { tools, maxSteps: 5 } : {}),
      providerOptions,
      onChunk: ({ chunk }) => {
        if (ttftMs === undefined && (chunk.type === 'text-delta' || chunk.type === 'reasoning-delta')) {
          ttftMs = Date.now() - startTime
        }
      },
      onError: ({ error }) => {
        logger.error('llm.stream.error', {
          conversationId,
          level: conversation.level,
          requestedModel,
          fallbackModel: FALLBACK_MODEL,
          latencyMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        })
      },
      onFinish: async ({ text, finishReason, totalUsage, providerMetadata, model: responseModel }) => {
        const latencyMs = Date.now() - startTime
        const usage = mapLanguageModelUsage(totalUsage)
        const openrouterUsage = providerMetadata?.openrouter?.usage

        await chatService.saveMessage({
          conversationId,
          role: 'assistant',
          content: text,
          parts: [{ type: 'text', text }],
          metadata: {
            finishReason,
            usage,
            latencyMs,
            ...(ttftMs === undefined ? {} : { ttftMs }),
            requestedModel,
            fallbackModel: FALLBACK_MODEL,
            model: responseModel.modelId,
            provider: responseModel.provider,
            ...(openrouterUsage ? { providerMetadata: { openrouter: { usage: openrouterUsage } } } : {}),
          },
        })

        logger.info('llm.stream.finish', {
          conversationId,
          level: conversation.level,
          requestedModel,
          fallbackModel: FALLBACK_MODEL,
          model: responseModel.modelId,
          provider: responseModel.provider,
          finishReason,
          latencyMs,
          ttftMs,
          ...usage,
          ...(openrouterUsage ? { openrouterUsage } : {}),
        })

        if (!NORMAL_FINISH_REASONS.has(finishReason)) {
          logger.warn('llm.stream.abnormal_finish', {
            conversationId,
            requestedModel,
            fallbackModel: FALLBACK_MODEL,
            model: responseModel.modelId,
            finishReason,
          })
        }
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
