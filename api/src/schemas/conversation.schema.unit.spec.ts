import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createConversationSchema } from './conversation.schema.js'

test('createConversationSchema accepts allowed free Gemma 4 models', () => {
  const primary = createConversationSchema.safeParse({
    level: 'B1',
    model: 'google/gemma-4-31b-it:free',
  })
  const fallback = createConversationSchema.safeParse({
    level: 'B1',
    model: 'google/gemma-4-26b-a4b-it:free',
  })

  assert.strictEqual(primary.success, true)
  assert.strictEqual(fallback.success, true)
})

test('createConversationSchema rejects unsupported or paid models', () => {
  const result = createConversationSchema.safeParse({
    level: 'B1',
    model: 'openai/gpt-4o',
  })

  assert.strictEqual(result.success, false)
})
