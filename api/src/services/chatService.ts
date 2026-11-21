import { pipeUIMessageStreamToResponse, stepCountIs, streamText } from 'ai'
import { asc, eq } from 'drizzle-orm'
import type { Response } from 'express'

import { db } from '../database/client.js'
import { conversations, messages } from '../database/schema.js'
import { getChatModel } from '../lib/ai/client.js'
import { DEFAULT_GENERATION_PARAMS, FALLBACK_MODEL, MAX_HISTORY_MESSAGES } from '../lib/ai/config.js'
import { buildOpenRouterProviderOptions } from '../lib/ai/openrouterOptions.js'
import { webSearchTool } from '../lib/ai/tools/webSearch.js'
import { mapLanguageModelUsage } from '../lib/ai/usageMetadata.js'
import { evaluate } from '../lib/evaluation/evaluator.js'
import { logger } from '../lib/observability/logger.js'
import { loadPrompt } from '../lib/prompts/loader.js'
import { isValidLevel } from '../types/level.js'
import type { CreateMessageInput, MessagePart } from '../types/message.js'

const NORMAL_FINISH_REASONS = new Set(['stop'])

export interface StepLike {
  text: string
  toolCalls: ReadonlyArray<{
    toolCallId: string
    toolName: string
    input: unknown
  }>
  toolResults: ReadonlyArray<{
    toolCallId: string
    output: unknown
  }>
}

export function buildModelMessages(
  history: ReadonlyArray<{ role: string; content: string }>,
  userContent: string,
  maxHistoryMessages: number = MAX_HISTORY_MESSAGES,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const filtered = history.filter(message => message.role === 'user' || message.role === 'assistant')
  const recentHistory = (maxHistoryMessages > 0 ? filtered.slice(-maxHistoryMessages) : []).map(message => ({
    role: message.role as 'user' | 'assistant',
    content: message.content,
  }))

  return [...recentHistory, { role: 'user', content: userContent }]
}

export function buildAssistantMessageParts(steps: ReadonlyArray<StepLike>, fallbackText: string): MessagePart[] {
  const parts: MessagePart[] = []

  for (const step of steps) {
    const resultsById = new Map(step.toolResults.map(result => [result.toolCallId, result.output]))

    for (const toolCall of step.toolCalls) {
      const hasOutput = resultsById.has(toolCall.toolCallId)
      parts.push({
        type: `tool-${toolCall.toolName}`,
        toolCallId: toolCall.toolCallId,
        state: hasOutput ? 'output-available' : 'input-available',
        input: toolCall.input,
        ...(hasOutput ? { output: resultsById.get(toolCall.toolCallId) } : {}),
      })
    }

    if (step.text.trim()) {
      parts.push({ type: 'text', text: step.text })
    }
  }

  if (parts.length === 0 && fallbackText.trim()) {
    parts.push({ type: 'text', text: fallbackText })
  }

  return parts
}

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

  async streamResponse(
    conversationId: string,
    userContent: string,
    res: Response,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    // Fetch conversation
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId))

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }

    if (conversation.finishedAt !== null) {
      res.status(409).json({ error: 'Conversation is already finished' })
      return
    }

    // Load history from DB
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))

    // Prepare prompt and model before persisting the user message so config errors fail fast
    const systemPrompt = await loadPrompt(conversation.level, conversation.profile)
    const requestedModel = conversation.model
    const model = getChatModel(requestedModel)
    const providerOptions = buildOpenRouterProviderOptions({
      conversationId,
      primaryModel: requestedModel,
      fallbackModel: FALLBACK_MODEL,
      includeUsage: true,
    })

    // Save user message before streaming
    const savedUserMessage = await chatService.saveMessage({
      conversationId,
      role: 'user',
      content: userContent,
      parts: [{ type: 'text', text: userContent }],
      metadata: {},
    })

    // Build model messages with sliding window + new user message
    const modelMessages = buildModelMessages(history, userContent)

    const startTime = Date.now()
    let ttftMs: number | undefined
    let assistantSaved = false

    const cleanupOrphanedUserMessage = async () => {
      if (assistantSaved) return
      await db
        .delete(messages)
        .where(eq(messages.id, savedUserMessage.id))
        .catch(() => {})
    }

    const tools = conversation.webSearchEnabled ? { webSearch: webSearchTool } : undefined

    const result = streamText({
      model,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: modelMessages,
      ...DEFAULT_GENERATION_PARAMS,
      ...(tools ? { tools, stopWhen: stepCountIs(5) } : {}),
      ...(abortSignal ? { abortSignal } : {}),
      providerOptions,
      onChunk: ({ chunk }) => {
        if (ttftMs === undefined && (chunk.type === 'text-delta' || chunk.type === 'reasoning-delta')) {
          ttftMs = Date.now() - startTime
        }
      },
      onAbort: async () => {
        await cleanupOrphanedUserMessage()
      },
      onError: async ({ error }) => {
        logger.error('llm.stream.error', {
          conversationId,
          level: conversation.level,
          requestedModel,
          fallbackModel: FALLBACK_MODEL,
          latencyMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        })

        await cleanupOrphanedUserMessage()
      },
      onFinish: async ({ text, steps, finishReason, totalUsage, providerMetadata, model: responseModel }) => {
        const latencyMs = Date.now() - startTime
        const usage = mapLanguageModelUsage(totalUsage)
        const openrouterUsage = providerMetadata?.openrouter?.usage
        const parts = buildAssistantMessageParts(steps, text)
        const evaluation = text.trim() && isValidLevel(conversation.level) ? evaluate(text, conversation.level) : null

        if (parts.length > 0) {
          await chatService.saveMessage({
            conversationId,
            role: 'assistant',
            content: text,
            parts,
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
              ...(evaluation
                ? {
                    evaluation: {
                      passed: evaluation.passed,
                      wordCount: evaluation.wordCount,
                      correctionCount: evaluation.correctionCount,
                      violations: evaluation.violations,
                    },
                  }
                : {}),
            },
          })
          assistantSaved = true
        }

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
          ...(evaluation
            ? {
                evaluationPassed: evaluation.passed,
                evaluationWordCount: evaluation.wordCount,
                evaluationViolations: evaluation.violations,
              }
            : {}),
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
    await pipeUIMessageStreamToResponse({
      response: res,
      stream: result.toUIMessageStream(),
      status: 200,
    })
  },
}
