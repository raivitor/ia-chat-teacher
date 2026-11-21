'use client'

import type { UIMessage } from 'ai'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'

import { api, type ConversationWithMessages } from '../../lib/api'
import MessageInput from './MessageInput'
import MessageList from './MessageList'

interface ChatInterfaceProps {
  conversationId: string
}

export function dbMessageToUIMessage(msg: ConversationWithMessages['messages'][number]): UIMessage {
  const parts: UIMessage['parts'] =
    msg.parts.length > 0 ? (msg.parts as UIMessage['parts']) : [{ type: 'text' as const, text: msg.content }]

  return {
    id: msg.id,
    role: msg.role as UIMessage['role'],
    parts,
  }
}

export function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR')
}

interface ContextUsageProps {
  tokensUsed: number
  contextWindow: number
}

export function ContextUsage({ tokensUsed, contextWindow }: ContextUsageProps) {
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

interface ChatSessionProps {
  conversationId: string
  initialConversation: ConversationWithMessages
  modelsMap: Record<string, number>
}

function ChatSession({ conversationId, initialConversation, modelsMap }: ChatSessionProps) {
  const [conversation, setConversation] = useState(initialConversation)
  const [initialMessages] = useState(() =>
    initialConversation.messages.filter(m => m.role !== 'system').map(dbMessageToUIMessage),
  )
  const [inputValue, setInputValue] = useState('')
  const prevStatusRef = useRef<string>('')

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
    let cancelled = false

    if (prevStatusRef.current === 'streaming' && status === 'ready') {
      api
        .getConversation(conversationId)
        .then(updated => {
          if (!cancelled) setConversation(updated)
        })
        .catch(() => undefined)
    }
    prevStatusRef.current = status

    return () => {
      cancelled = true
    }
  }, [status, conversationId])

  const isActive = status === 'submitted' || status === 'streaming'

  const contextWindow = modelsMap[conversation.model] ?? null
  const tokensUsed = (() => {
    // Use the last assistant message's totalTokens as the context usage indicator.
    // Each call sends the full conversation history, so the most recent message's
    // inputTokens already reflects the entire accumulated context. Summing across
    // all messages would double-count earlier turns.
    const lastAssistantWithUsage = conversation.messages.filter(m => m.role === 'assistant' && m.metadata?.usage).at(-1)

    if (!lastAssistantWithUsage?.metadata?.usage) return 0

    const {
      inputTokens = 0,
      outputTokens = 0,
      totalTokens,
    } = lastAssistantWithUsage.metadata.usage as {
      inputTokens?: number
      outputTokens?: number
      totalTokens?: number
    }

    return totalTokens ?? inputTokens + outputTokens
  })()

  async function handleSubmit() {
    if (!inputValue.trim() || isActive) return
    const text = inputValue
    setInputValue('')
    await sendMessage({ text })
  }

  return (
    <div className='chat-interface'>
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

type LoadState =
  | {
      conversationId: string
      status: 'loaded'
      conversation: ConversationWithMessages
      modelsMap: Record<string, number>
    }
  | {
      conversationId: string
      status: 'error'
      error: string
    }
  | null

export default function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [loadState, setLoadState] = useState<LoadState>(null)

  useEffect(() => {
    let cancelled = false

    void Promise.all([api.getConversation(conversationId), api.getModels()])
      .then(([conversation, { models }]) => {
        if (cancelled) return

        setLoadState({
          conversationId,
          status: 'loaded',
          conversation,
          modelsMap: Object.fromEntries(models.map(m => [m.id, m.contextWindow])),
        })
      })
      .catch(() => {
        if (cancelled) return

        setLoadState({
          conversationId,
          status: 'error',
          error: 'Failed to load conversation history.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [conversationId])

  if (loadState?.conversationId !== conversationId) {
    return <div className='chat-interface' />
  }

  if (loadState.status === 'error') {
    return (
      <div className='chat-interface'>
        <div className='load-error'>{loadState.error}</div>
      </div>
    )
  }

  return (
    <ChatSession
      key={conversationId}
      conversationId={conversationId}
      initialConversation={loadState.conversation}
      modelsMap={loadState.modelsMap}
    />
  )
}
