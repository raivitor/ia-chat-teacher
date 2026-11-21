import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildAssistantMessageParts, buildModelMessages } from './chatService.js'

test('buildModelMessages filters system messages and applies sliding window', () => {
  const history = [
    { role: 'system', content: 'sys' },
    { role: 'user', content: 'm1' },
    { role: 'assistant', content: 'm2' },
    { role: 'user', content: 'm3' },
    { role: 'assistant', content: 'm4' },
  ]

  const result = buildModelMessages(history, 'm5', 2)

  assert.deepStrictEqual(result, [
    { role: 'user', content: 'm3' },
    { role: 'assistant', content: 'm4' },
    { role: 'user', content: 'm5' },
  ])
})

test('buildModelMessages handles maxHistoryMessages of 0 without leaking history', () => {
  const result = buildModelMessages([{ role: 'user', content: 'old' }], 'new', 0)

  assert.deepStrictEqual(result, [{ role: 'user', content: 'new' }])
})

test('buildAssistantMessageParts preserves tool calls, tool results, and text across steps', () => {
  const parts = buildAssistantMessageParts(
    [
      {
        text: '',
        toolCalls: [{ toolCallId: 'call-1', toolName: 'webSearch', input: { query: 'english idioms' } }],
        toolResults: [{ toolCallId: 'call-1', output: [{ title: 'Idioms', url: 'https://example.com' }] }],
      },
      {
        text: 'Here is a great idiom for you!',
        toolCalls: [],
        toolResults: [],
      },
    ],
    'Here is a great idiom for you!',
  )

  assert.deepStrictEqual(parts, [
    {
      type: 'tool-webSearch',
      toolCallId: 'call-1',
      state: 'output-available',
      input: { query: 'english idioms' },
      output: [{ title: 'Idioms', url: 'https://example.com' }],
    },
    {
      type: 'text',
      text: 'Here is a great idiom for you!',
    },
  ])
})

test('buildAssistantMessageParts falls back to text when steps have no parts', () => {
  const parts = buildAssistantMessageParts([], 'Fallback reply')

  assert.deepStrictEqual(parts, [{ type: 'text', text: 'Fallback reply' }])
})

test('buildAssistantMessageParts returns empty array when nothing was generated', () => {
  const parts = buildAssistantMessageParts([], '   ')

  assert.deepStrictEqual(parts, [])
})
