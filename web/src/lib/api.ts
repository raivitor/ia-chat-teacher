const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type Profile = 'professor' | 'bestfriend' | 'secretary' | 'girlfriend'

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  parts: Array<{ type: string; text?: string; [key: string]: unknown }>
  metadata: Record<string, unknown>
  createdAt: string
}

export interface Conversation {
  id: string
  seq: number
  level: string
  profile: Profile
  model: string
  title: string
  metadata: Record<string, unknown>
  webSearchEnabled: boolean
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

export interface AIModel {
  id: string
  name: string
  contextWindow: number
}

export interface ModelsResponse {
  models: AIModel[]
  defaultModel: string
  fallbackModel: string
  productionRecommendedModel: string
  contextWindow: number | null
}

export const api = {
  async getModels(): Promise<ModelsResponse> {
    const res = await fetch(`${API_URL}/api/models`)
    if (!res.ok) throw new Error('Failed to fetch models')
    return res.json() as Promise<ModelsResponse>
  },

  async listConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_URL}/api/conversations`)
    if (!res.ok) throw new Error('Failed to fetch conversations')
    const data = (await res.json()) as { conversations: Conversation[] }
    return data.conversations
  },

  async createConversation(
    level: Level,
    model?: string,
    profile?: Profile,
    webSearchEnabled?: boolean,
  ): Promise<Conversation> {
    const res = await fetch(`${API_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, model, profile, webSearchEnabled }),
    })
    if (!res.ok) throw new Error('Failed to create conversation')
    const data = (await res.json()) as { conversation: Conversation }
    return data.conversation
  },

  async getConversation(id: string): Promise<ConversationWithMessages> {
    const res = await fetch(`${API_URL}/api/conversations/${id}`)
    if (!res.ok) throw new Error('Failed to fetch conversation')
    const data = (await res.json()) as { conversation: ConversationWithMessages }
    return data.conversation
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/conversations/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete conversation')
  },

  chatUrl(): string {
    return `${API_URL}/api/chat`
  },

  async getUnreviewedCount(): Promise<number> {
    const res = await fetch(`${API_URL}/api/review/unreviewed-count`)
    if (!res.ok) throw new Error('Failed to fetch unreviewed count')
    const data = (await res.json()) as { count: number }
    return data.count
  },

  async generateReview(): Promise<Blob> {
    const res = await fetch(`${API_URL}/api/review/generate`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to generate review')
    return res.blob()
  },
}
