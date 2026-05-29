import assert from 'node:assert/strict'
import { before, beforeEach, test } from 'node:test'

import { getResponseBody } from '../test/helpers/supertest.js'
import {
  api,
  integrationDescribe,
  prepareIntegrationSuite,
  resetDatabase,
} from '../test/setup/integration.js'

type ConversationBody = {
  id: string
  seq: number
  level: string
  model: string
  title: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

type ConversationResponse = { conversation: ConversationBody }
type ConversationsListResponse = { conversations: ConversationBody[] }
type ErrorBody = { error: string }
type MessageResponse = { message: string }

integrationDescribe('Route integration: conversations', () => {
  before(async () => {
    await prepareIntegrationSuite()
  })

  beforeEach(async () => {
    await resetDatabase()
  })

  test('POST /api/conversations returns 201 for valid level', async () => {
    const response = await api.post('/api/conversations').send({ level: 'B1' })
    const body = getResponseBody<ConversationResponse>(response)

    assert.strictEqual(response.status, 201)
    assert.ok(body.conversation.id)
    assert.strictEqual(body.conversation.level, 'B1')
    assert.match(body.conversation.title, /^Conversa \d+ - \d{2}\/\d{2} - \d{2}:\d{2}$/)
  })

  test('POST /api/conversations returns 400 for invalid level', async () => {
    const response = await api.post('/api/conversations').send({ level: 'X9' })

    assert.strictEqual(response.status, 400)
  })

  test('POST /api/conversations returns 400 for missing level', async () => {
    const response = await api.post('/api/conversations').send({})

    assert.strictEqual(response.status, 400)
  })

  test('GET /api/conversations returns empty list initially', async () => {
    const response = await api.get('/api/conversations')
    const body = getResponseBody<ConversationsListResponse>(response)

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(body.conversations, [])
  })

  test('GET /api/conversations returns created conversations', async () => {
    await api.post('/api/conversations').send({ level: 'A1' })
    await api.post('/api/conversations').send({ level: 'C2' })

    const response = await api.get('/api/conversations')
    const body = getResponseBody<ConversationsListResponse>(response)

    assert.strictEqual(response.status, 200)
    assert.strictEqual(body.conversations.length, 2)
  })

  test('GET /api/conversations/:id returns 200 for existing conversation', async () => {
    const createResponse = await api.post('/api/conversations').send({ level: 'B2' })
    const created = getResponseBody<ConversationResponse>(createResponse).conversation

    const response = await api.get(`/api/conversations/${created.id}`)
    const body = getResponseBody<{ conversation: ConversationBody & { messages: unknown[] } }>(
      response,
    )

    assert.strictEqual(response.status, 200)
    assert.strictEqual(body.conversation.id, created.id)
    assert.deepStrictEqual(body.conversation.messages, [])
  })

  test('GET /api/conversations/:id returns 404 for missing conversation', async () => {
    const response = await api.get('/api/conversations/00000000-0000-0000-0000-000000000000')
    const body = getResponseBody<ErrorBody>(response)

    assert.strictEqual(response.status, 404)
    assert.ok(body.error)
  })

  test('GET /api/conversations/:id returns 400 for invalid UUID', async () => {
    const response = await api.get('/api/conversations/not-a-uuid')

    assert.strictEqual(response.status, 400)
  })

  test('DELETE /api/conversations/:id returns 200 for existing conversation', async () => {
    const createResponse = await api.post('/api/conversations').send({ level: 'C1' })
    const created = getResponseBody<ConversationResponse>(createResponse).conversation

    const deleteResponse = await api.delete(`/api/conversations/${created.id}`)
    const body = getResponseBody<MessageResponse>(deleteResponse)

    assert.strictEqual(deleteResponse.status, 200)
    assert.ok(body.message)

    const getResponse = await api.get(`/api/conversations/${created.id}`)
    assert.strictEqual(getResponse.status, 404)
  })

  test('DELETE /api/conversations/:id returns 404 for missing conversation', async () => {
    const response = await api.delete('/api/conversations/00000000-0000-0000-0000-000000000000')
    const body = getResponseBody<ErrorBody>(response)

    assert.strictEqual(response.status, 404)
    assert.ok(body.error)
  })
})

integrationDescribe('Route integration: chat validation', () => {
  before(async () => {
    await prepareIntegrationSuite()
  })

  beforeEach(async () => {
    await resetDatabase()
  })

  test('POST /api/chat returns 400 for missing conversationId', async () => {
    const response = await api.post('/api/chat').send({
      message: { role: 'user', content: 'Hello' },
    })

    assert.strictEqual(response.status, 400)
  })

  test('POST /api/chat returns 400 for invalid conversationId', async () => {
    const response = await api.post('/api/chat').send({
      conversationId: 'not-a-uuid',
      message: { role: 'user', content: 'Hello' },
    })

    assert.strictEqual(response.status, 400)
  })

  test('POST /api/chat returns 400 for missing message', async () => {
    const response = await api.post('/api/chat').send({
      conversationId: '00000000-0000-0000-0000-000000000000',
    })

    assert.strictEqual(response.status, 400)
  })

  test('POST /api/chat returns 400 for payload with messages array (history field rejected)', async () => {
    const response = await api.post('/api/chat').send({
      conversationId: '00000000-0000-0000-0000-000000000000',
      message: { role: 'user', content: 'Hello' },
      messages: [{ role: 'user', content: 'This should be rejected' }],
    })

    assert.strictEqual(response.status, 400)
  })

  test('POST /api/chat returns 404 for non-existing conversationId with valid UUID', async () => {
    const response = await api.post('/api/chat').send({
      conversationId: '00000000-0000-0000-0000-000000000000',
      message: { role: 'user', content: 'Hello' },
    })

    assert.strictEqual(response.status, 404)
  })
})
