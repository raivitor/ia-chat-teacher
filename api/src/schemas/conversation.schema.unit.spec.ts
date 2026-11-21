import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createConversationSchema } from './conversation.schema.js'

test('createConversationSchema accepts allowed Google models', () => {
  for (const model of ['google/gemini-3.8-flash', 'google/gemini-3.1-flash-lite', 'google/gemma-4-31b-it:free']) {
    const result = createConversationSchema.safeParse({ level: 'B1', model })
    assert.strictEqual(result.success, true)
  }
})

test('createConversationSchema rejects unsupported models', () => {
  const result = createConversationSchema.safeParse({
    level: 'B1',
    model: 'openai/gpt-4o',
  })

  assert.strictEqual(result.success, false)
})
