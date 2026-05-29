import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildOpenRouterProviderOptions, uniqueModels } from './openrouterOptions.js'

test('buildOpenRouterProviderOptions configures sticky low-latency fallback routing', () => {
  const options = buildOpenRouterProviderOptions({
    conversationId: 'conversation-1',
    primaryModel: 'google/gemma-4-31b-it:free',
    fallbackModel: 'deepseek/deepseek-v4-flash',
  })

  assert.deepStrictEqual(options, {
    openrouter: {
      session_id: 'conversation-1',
      provider: {
        sort: 'latency',
        allow_fallbacks: true,
      },
      reasoning: { effort: 'none' },
      models: ['google/gemma-4-31b-it:free', 'deepseek/deepseek-v4-flash'],
      usage: { include: true },
    },
  })
})

test('buildOpenRouterProviderOptions can omit usage accounting', () => {
  const options = buildOpenRouterProviderOptions({
    conversationId: 'conversation-1',
    primaryModel: 'deepseek/deepseek-v4-flash',
    fallbackModel: 'deepseek/deepseek-v4-flash',
    includeUsage: false,
  })

  assert.deepStrictEqual(options.openrouter.models, ['deepseek/deepseek-v4-flash'])
  assert.equal(options.openrouter.usage, undefined)
})

test('uniqueModels removes empty values and duplicates while preserving order', () => {
  assert.deepStrictEqual(uniqueModels(['a', undefined, 'b', 'a']), ['a', 'b'])
})
