import assert from 'node:assert/strict'
import { test } from 'node:test'

import { mapLanguageModelUsage } from './usageMetadata.js'

test('mapLanguageModelUsage maps standard and detailed token counts', () => {
  const usage = mapLanguageModelUsage({
    inputTokens: 100,
    inputTokenDetails: {
      noCacheTokens: 70,
      cacheReadTokens: 20,
      cacheWriteTokens: 10,
    },
    outputTokens: 40,
    outputTokenDetails: {
      textTokens: 35,
      reasoningTokens: 5,
    },
    totalTokens: 140,
    raw: {
      prompt_tokens: 100,
      completion_tokens: 40,
    },
  })

  assert.deepStrictEqual(usage, {
    inputTokens: 100,
    outputTokens: 40,
    totalTokens: 140,
    cacheReadTokens: 20,
    cacheWriteTokens: 10,
    reasoningTokens: 5,
    inputTokenDetails: {
      cacheReadTokens: 20,
      cacheWriteTokens: 10,
    },
    outputTokenDetails: {
      reasoningTokens: 5,
    },
    raw: {
      prompt_tokens: 100,
      completion_tokens: 40,
    },
  })
})

test('mapLanguageModelUsage defaults missing fields to zero and derives total tokens', () => {
  const usage = mapLanguageModelUsage({
    inputTokens: 10,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokens: 5,
    outputTokenDetails: {
      textTokens: undefined,
      reasoningTokens: undefined,
    },
    totalTokens: undefined,
  })

  assert.deepStrictEqual(usage, {
    inputTokens: 10,
    outputTokens: 5,
    totalTokens: 15,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    inputTokenDetails: {
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    outputTokenDetails: {
      reasoningTokens: 0,
    },
  })
})

test('mapLanguageModelUsage handles absent usage', () => {
  assert.deepStrictEqual(mapLanguageModelUsage(), {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    inputTokenDetails: {
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    outputTokenDetails: {
      reasoningTokens: 0,
    },
  })
})
