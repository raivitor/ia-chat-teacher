import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildOpenRouterProviderOptions, uniqueModels } from './openrouterOptions.js'

test('buildOpenRouterProviderOptions configures sticky low-latency fallback routing', () => {
  const options = buildOpenRouterProviderOptions({
    conversationId: 'conversation-1',
    primaryModel: 'google/gemma-4-31b-it:free',
    fallbackModel: 'google/gemma-4-26b-a4b-it:free',
  })

  assert.deepStrictEqual(options, {
    openrouter: {
      session_id: 'conversation-1',
      provider: {
        sort: 'latency',
        allow_fallbacks: true,
      },
      reasoning: { effort: 'none' },
      models: ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free'],
      usage: { include: true },
    },
  })
})

test('buildOpenRouterProviderOptions can omit usage accounting', () => {
  const options = buildOpenRouterProviderOptions({
    conversationId: 'conversation-1',
    primaryModel: 'google/gemma-4-26b-a4b-it:free',
    fallbackModel: 'google/gemma-4-26b-a4b-it:free',
    includeUsage: false,
  })

  assert.deepStrictEqual(options.openrouter.models, ['google/gemma-4-26b-a4b-it:free'])
  assert.equal(options.openrouter.usage, undefined)
})

test('uniqueModels removes empty values and duplicates while preserving order', () => {
  assert.deepStrictEqual(uniqueModels(['a', undefined, 'b', 'a']), ['a', 'b'])
})
