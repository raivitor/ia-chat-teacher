import type { Message } from './message.js'

export interface Conversation {
  id: string
  seq: number
  level: string
  profile: string
  model: string
  title: string
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

export interface CreateConversationInput {
  level: string
  profile?: string
  model?: string
  metadata?: Record<string, unknown>
}
