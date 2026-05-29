'use client'

import type { UIMessage } from 'ai'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'

import { api, type AIModel, type ConversationWithMessages } from '../../lib/api'
import MessageInput from './MessageInput'
import MessageList from './MessageList'

interface ChatInterfaceProps {
  conversationId: string
}

function dbMessageToUIMessage(msg: ConversationWithMessages['messages'][number]): UIMessage {
  const parts: UIMessage['parts'] =
    msg.parts.length > 0 ? (msg.parts as UIMessage['parts']) : [{ type: 'text' as const, text: msg.content }]

  return {
    id: msg.id,
    role: msg.role as UIMessage['role'],
    parts,
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR')
}

interface ContextUsageProps {
  tokensUsed: number
  contextWindow: number
}

function ContextUsage({ tokensUsed, contextWindow }: ContextUsageProps) {
  const pct = Math.min((tokensUsed / contextWindow) * 100, 100)
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e'

  return (
    <div className='context-usage'>
      <div className='context-usage-label'>
        Contexto: {formatNumber(tokensUsed)} / {formatNumber(contextWindow)} tokens ({pct.toFixed(1)}%)
      </div>
      <div className='context-usage-bar-track'>
        <div
          className='context-usage-bar-fill'
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null)
  const [modelsMap, setModelsMap] = useState<Record<string, number>>({})
  const prevStatusRef = useRef<string>('')

  useEffect(() => {
    void Promise.all([api.getConversation(conversationId), api.getModels()])
      .then(([conv, { models }]) => {
        const map: Record<string, number> = {}
        models.forEach((m: AIModel) => {
          map[m.id] = m.contextWindow
        })
        setModelsMap(map)
        setConversation(conv)
        const uiMessages = conv.messages.filter(m => m.role !== 'system').map(dbMessageToUIMessage)
        setInitialMessages(uiMessages)
      })
      .catch(() => {
        setLoadError('Failed to load conversation history.')
      })
  }, [conversationId])

  const { messages, status, error, sendMessage } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: api.chatUrl(),
      prepareSendMessagesRequest({ messages: allMessages }) {
        const lastUserMessage = allMessages.findLast(m => m.role === 'user')
        const lastTextPart = lastUserMessage?.parts.findLast(p => p.type === 'text')
        const content = lastTextPart?.type === 'text' ? lastTextPart.text : ''
        return {
          body: {
            conversationId,
            message: {
              role: 'user',
              content,
            },
          },
        }
      },
    }),
  })

  // Refetch conversation after streaming ends to get updated token counts
  useEffect(() => {
    if (prevStatusRef.current === 'streaming' && status === 'ready') {
      api
        .getConversation(conversationId)
        .then(setConversation)
        .catch(() => undefined)
    }
    prevStatusRef.current = status
  }, [status, conversationId])

  const isActive = status === 'submitted' || status === 'streaming'

  const contextWindow = conversation ? (modelsMap[conversation.model] ?? null) : null
  const tokensUsed = (() => {
    if (!conversation) return 0
    return conversation.messages
      .filter(m => m.role === 'assistant')
      .reduce((total, message) => {
        if (!message.metadata?.usage) return total

        const {
          inputTokens = 0,
          outputTokens = 0,
          totalTokens,
        } = message.metadata.usage as {
          inputTokens?: number
          outputTokens?: number
          totalTokens?: number
        }

        return total + (totalTokens ?? inputTokens + outputTokens)
      }, 0)
  })()

  async function handleSubmit() {
    if (!inputValue.trim() || isActive) return
    const text = inputValue
    setInputValue('')
    await sendMessage({ text })
  }

  return (
    <div className='chat-interface'>
      {loadError && <div className='load-error'>{loadError}</div>}
      {error && <div className='stream-error'>Error: {error.message}</div>}
      <MessageList
        messages={messages}
        isStreaming={status === 'streaming'}
      />
      {contextWindow !== null && tokensUsed > 0 && (
        <ContextUsage
          tokensUsed={tokensUsed}
          contextWindow={contextWindow}
        />
      )}
      <MessageInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={() => {
          void handleSubmit()
        }}
        disabled={isActive}
      />
    </div>
  )
}
