import assert from 'node:assert/strict'
import { before, beforeEach, test } from 'node:test'

import { conversationService } from '../services/conversationService.js'
import { integrationDescribe, prepareIntegrationSuite, resetDatabase } from '../test/setup/integration.js'

integrationDescribe('Service integration: conversationService', () => {
  before(async () => {
    await prepareIntegrationSuite()
  })

  beforeEach(async () => {
    await resetDatabase()
  })

  test('createConversation creates with valid level and correct title format', async () => {
    const conversation = await conversationService.createConversation({ level: 'B1' })

    assert.ok(conversation.id)
    assert.strictEqual(conversation.level, 'B1')
    assert.ok(typeof conversation.seq === 'number' && conversation.seq >= 1)
    assert.match(conversation.title, /^Conversa \d+ - \d{2}\/\d{2} - \d{2}:\d{2}$/)
    assert.deepStrictEqual(conversation.metadata, {})
  })

  test('createConversation seq is unique and incremental', async () => {
    const c1 = await conversationService.createConversation({ level: 'A1' })
    const c2 = await conversationService.createConversation({ level: 'A2' })

    assert.notStrictEqual(c1.seq, c2.seq)
    assert.ok(c2.seq > c1.seq)
  })

  test('createConversation title uses seq as id-incremental', async () => {
    const conversation = await conversationService.createConversation({ level: 'C1' })

    assert.ok(conversation.title.startsWith(`Conversa ${conversation.seq} -`))
  })

  test('createConversation persists metadata', async () => {
    const metadata = { source: 'test', count: 42 }
    const conversation = await conversationService.createConversation({ level: 'B2', metadata })

    assert.deepStrictEqual(conversation.metadata, metadata)
  })

  test('createConversation rejects invalid level', async () => {
    await assert.rejects(() => conversationService.createConversation({ level: 'X9' }), /Invalid level/)
  })

  test('listConversations returns all conversations in descending order', async () => {
    await conversationService.createConversation({ level: 'A1' })
    await conversationService.createConversation({ level: 'B1' })

    const list = await conversationService.listConversations()

    assert.ok(list.length >= 2)
    const first = list[0]
    const second = list[1]
    assert.ok(first && second && first.createdAt >= second.createdAt)
  })

  test('getConversation returns conversation with empty messages', async () => {
    const created = await conversationService.createConversation({ level: 'A2' })
    const found = await conversationService.getConversation(created.id)

    assert.ok(found)
    assert.strictEqual(found.id, created.id)
    assert.deepStrictEqual(found.messages, [])
  })

  test('getConversation returns null for unknown id', async () => {
    const result = await conversationService.getConversation('00000000-0000-0000-0000-000000000000')

    assert.strictEqual(result, null)
  })

  test('deleteConversation removes the conversation', async () => {
    const created = await conversationService.createConversation({ level: 'C2' })
    const deleted = await conversationService.deleteConversation(created.id)

    assert.ok(deleted)
    assert.strictEqual(deleted.id, created.id)

    const found = await conversationService.getConversation(created.id)
    assert.strictEqual(found, null)
  })

  test('deleteConversation returns null for unknown id', async () => {
    const result = await conversationService.deleteConversation('00000000-0000-0000-0000-000000000000')

    assert.strictEqual(result, null)
  })
})
