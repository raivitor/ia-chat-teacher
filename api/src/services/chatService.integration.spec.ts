import assert from 'node:assert/strict'
import { before, beforeEach, test } from 'node:test'

import { chatService } from '../services/chatService.js'
import { conversationService } from '../services/conversationService.js'
import {
  integrationDescribe,
  prepareIntegrationSuite,
  resetDatabase,
} from '../test/setup/integration.js'

integrationDescribe('Service integration: chatService', () => {
  before(async () => {
    await prepareIntegrationSuite()
  })

  beforeEach(async () => {
    await resetDatabase()
  })

  test('saveMessage persists user message with content and parts', async () => {
    const conversation = await conversationService.createConversation({ level: 'B1' })

    const message = await chatService.saveMessage({
      conversationId: conversation.id,
      role: 'user',
      content: 'Hello, coach!',
      parts: [{ type: 'text', text: 'Hello, coach!' }],
      metadata: {},
    })

    assert.ok(message.id)
    assert.strictEqual(message.conversationId, conversation.id)
    assert.strictEqual(message.role, 'user')
    assert.strictEqual(message.content, 'Hello, coach!')
    assert.deepStrictEqual(message.parts, [{ type: 'text', text: 'Hello, coach!' }])
  })

  test('saveMessage persists assistant message with metadata', async () => {
    const conversation = await conversationService.createConversation({ level: 'A1' })

    const message = await chatService.saveMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: 'Great effort!',
      parts: [{ type: 'text', text: 'Great effort!' }],
      metadata: { finishReason: 'stop', latencyMs: 200, model: 'test-model' },
    })

    assert.strictEqual(message.role, 'assistant')
    assert.strictEqual(message.content, 'Great effort!')
    assert.deepStrictEqual(message.metadata, {
      finishReason: 'stop',
      latencyMs: 200,
      model: 'test-model',
    })
  })

  test('saveMessage updates conversation updatedAt', async () => {
    const conversation = await conversationService.createConversation({ level: 'B2' })
    const initialUpdatedAt = conversation.updatedAt

    // Small delay to ensure updatedAt changes
    await new Promise(resolve => setTimeout(resolve, 10))

    await chatService.saveMessage({
      conversationId: conversation.id,
      role: 'user',
      content: 'Test',
      parts: [],
      metadata: {},
    })

    const updated = await conversationService.getConversation(conversation.id)
    assert.ok(updated)
    assert.ok(updated.updatedAt >= initialUpdatedAt)
  })

  test('getConversation returns messages ordered by createdAt', async () => {
    const conversation = await conversationService.createConversation({ level: 'C1' })

    await chatService.saveMessage({
      conversationId: conversation.id,
      role: 'user',
      content: 'First',
      parts: [],
      metadata: {},
    })

    await chatService.saveMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: 'Reply',
      parts: [],
      metadata: {},
    })

    const found = await conversationService.getConversation(conversation.id)
    assert.ok(found)
    assert.strictEqual(found.messages.length, 2)
    assert.strictEqual(found.messages[0]?.role, 'user')
    assert.strictEqual(found.messages[1]?.role, 'assistant')
  })

  test('deleteConversation cascades to messages', async () => {
    const conversation = await conversationService.createConversation({ level: 'A2' })

    await chatService.saveMessage({
      conversationId: conversation.id,
      role: 'user',
      content: 'Will be deleted',
      parts: [],
      metadata: {},
    })

    await conversationService.deleteConversation(conversation.id)

    const found = await conversationService.getConversation(conversation.id)
    assert.strictEqual(found, null)
  })
})
