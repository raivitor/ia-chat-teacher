import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from './api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function ok(data: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(data),
  } as unknown as Response
}

function notOk(): Response {
  return { ok: false } as unknown as Response
}

beforeEach(() => mockFetch.mockReset())

describe('api.getModels', () => {
  it('returns the models response', async () => {
    const data = {
      models: [{ id: 'model-1', name: 'Model 1', contextWindow: 8192 }],
      defaultModel: 'model-1',
      fallbackModel: 'model-2',
      productionRecommendedModel: 'model-3',
      contextWindow: 8192,
    }
    mockFetch.mockResolvedValue(ok(data))

    const result = await api.getModels()

    expect(result).toEqual(data)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/models'))
  })

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValue(notOk())

    await expect(api.getModels()).rejects.toThrow('Failed to fetch models')
  })
})

describe('api.listConversations', () => {
  it('returns the conversations array', async () => {
    const conversations = [{ id: 'conv-1', title: 'Test', level: 'B1' }]
    mockFetch.mockResolvedValue(ok({ conversations }))

    const result = await api.listConversations()

    expect(result).toEqual(conversations)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/conversations'))
  })

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValue(notOk())

    await expect(api.listConversations()).rejects.toThrow('Failed to fetch conversations')
  })
})

describe('api.createConversation', () => {
  it('sends POST with level and model, returns conversation', async () => {
    const conversation = { id: 'conv-1', title: 'New', level: 'A1' }
    mockFetch.mockResolvedValue(ok({ conversation }))

    const result = await api.createConversation('A1', 'model-1')

    expect(result).toEqual(conversation)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/conversations'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'A1', model: 'model-1' }),
      }),
    )
  })

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValue(notOk())

    await expect(api.createConversation('B1')).rejects.toThrow('Failed to create conversation')
  })
})

describe('api.getConversation', () => {
  it('returns the conversation with messages', async () => {
    const conversation = { id: 'conv-1', messages: [] }
    mockFetch.mockResolvedValue(ok({ conversation }))

    const result = await api.getConversation('conv-1')

    expect(result).toEqual(conversation)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/conversations/conv-1'))
  })

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValue(notOk())

    await expect(api.getConversation('conv-1')).rejects.toThrow('Failed to fetch conversation')
  })
})

describe('api.deleteConversation', () => {
  it('sends DELETE request', async () => {
    mockFetch.mockResolvedValue(ok({}))

    await api.deleteConversation('conv-1')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/conversations/conv-1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValue(notOk())

    await expect(api.deleteConversation('conv-1')).rejects.toThrow('Failed to delete conversation')
  })
})

describe('api.chatUrl', () => {
  it('returns the chat API URL', () => {
    expect(api.chatUrl()).toContain('/api/chat')
  })
})

describe('api.getUnreviewedCount', () => {
  it('returns the unreviewed count', async () => {
    mockFetch.mockResolvedValue(ok({ count: 3 }))

    const result = await api.getUnreviewedCount()

    expect(result).toBe(3)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/review/unreviewed-count'))
  })

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValue(notOk())

    await expect(api.getUnreviewedCount()).rejects.toThrow('Failed to fetch unreviewed count')
  })
})

describe('api.generateReview', () => {
  it('sends POST and returns a Blob', async () => {
    const blob = new Blob(['csv content'], { type: 'text/csv' })
    mockFetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) } as unknown as Response)

    const result = await api.generateReview()

    expect(result).toBeInstanceOf(Blob)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/review/generate'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValue(notOk())

    await expect(api.generateReview()).rejects.toThrow('Failed to generate review')
  })
})
