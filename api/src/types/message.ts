export type MessageRole = 'user' | 'assistant' | 'system'

export interface MessagePart {
  type: string
  text?: string
  [key: string]: unknown
}

export interface MessageMetadata {
  finishReason?: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
    [key: string]: unknown
  }
  provider?: string
  latencyMs?: number
  model?: string
  [key: string]: unknown
}

export interface Message {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  parts: MessagePart[]
  metadata: MessageMetadata
  createdAt: Date
}

export interface CreateMessageInput {
  conversationId: string
  role: MessageRole
  content: string
  parts?: MessagePart[]
  metadata?: MessageMetadata
}

/** Convert a DB message to an AI SDK CoreMessage for model context */
export function toModelMessage(message: Message): {
  role: 'user' | 'assistant' | 'system'
  content: string
} {
  return {
    role: message.role,
    content: message.content,
  }
}
