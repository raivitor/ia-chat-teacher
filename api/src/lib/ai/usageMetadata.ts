import type { LanguageModelUsage } from 'ai'

export interface UsageMetadata {
  [key: string]: unknown
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  reasoningTokens: number
  inputTokenDetails: {
    cacheReadTokens: number
    cacheWriteTokens: number
  }
  outputTokenDetails: {
    reasoningTokens: number
  }
  raw?: unknown
}

function numberOrZero(value: number | undefined): number {
  return value ?? 0
}

export function mapLanguageModelUsage(usage?: LanguageModelUsage): UsageMetadata {
  const inputTokens = numberOrZero(usage?.inputTokens)
  const outputTokens = numberOrZero(usage?.outputTokens)

  return {
    inputTokens,
    outputTokens,
    totalTokens: numberOrZero(usage?.totalTokens) || inputTokens + outputTokens,
    cacheReadTokens: numberOrZero(usage?.inputTokenDetails?.cacheReadTokens),
    cacheWriteTokens: numberOrZero(usage?.inputTokenDetails?.cacheWriteTokens),
    reasoningTokens: numberOrZero(usage?.outputTokenDetails?.reasoningTokens),
    inputTokenDetails: {
      cacheReadTokens: numberOrZero(usage?.inputTokenDetails?.cacheReadTokens),
      cacheWriteTokens: numberOrZero(usage?.inputTokenDetails?.cacheWriteTokens),
    },
    outputTokenDetails: {
      reasoningTokens: numberOrZero(usage?.outputTokenDetails?.reasoningTokens),
    },
    ...(usage?.raw ? { raw: usage.raw } : {}),
  }
}
