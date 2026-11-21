import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildOpenRouterProviderOptions, uniqueModels } from './openrouterOptions.js'

test('buildOpenRouterProviderOptions configures sticky low-latency fallback routing', () => {
  const options = buildOpenRouterProviderOptions({
    conversationId: 'conversation-1',
    primaryModel: 'google/gemini-3.8-flash',
    fallbackModel: 'google/gemini-3.1-flash-lite',
  })

  assert.deepStrictEqual(options, {
    openrouter: {
      session_id: 'conversation-1',
      provider: {
        sort: 'latency',
        allow_fallbacks: true,
      },
      reasoning: { effort: 'none' },
      models: ['google/gemini-3.8-flash', 'google/gemini-3.1-flash-lite'],
      usage: { include: true },
    },
  })
})

test('buildOpenRouterProviderOptions can omit usage accounting', () => {
  const options = buildOpenRouterProviderOptions({
    conversationId: 'conversation-1',
    primaryModel: 'google/gemini-3.1-flash-lite',
    fallbackModel: 'google/gemini-3.1-flash-lite',
    includeUsage: false,
  })

  assert.deepStrictEqual(options.openrouter.models, ['google/gemini-3.1-flash-lite'])
  assert.equal(options.openrouter.usage, undefined)
})

test('uniqueModels removes empty values and duplicates while preserving order', () => {
  assert.deepStrictEqual(uniqueModels(['a', undefined, 'b', 'a']), ['a', 'b'])
})
