'use client'

import type { UIMessage } from 'ai'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useState } from 'react'

import { api, type ConversationWithMessages } from '../../lib/api'
import MessageInput from './MessageInput'
import MessageList from './MessageList'

interface ChatInterfaceProps {
  conversationId: string
}

function dbMessageToUIMessage(msg: ConversationWithMessages['messages'][number]): UIMessage {
  const parts: UIMessage['parts'] =
    msg.parts.length > 0
      ? (msg.parts as UIMessage['parts'])
      : [{ type: 'text' as const, text: msg.content }]

  return {
    id: msg.id,
    role: msg.role as UIMessage['role'],
    parts,
  }
}

export default function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    api
      .getConversation(conversationId)
      .then(conversation => {
        const uiMessages = conversation.messages
          .filter(m => m.role !== 'system')
          .map(dbMessageToUIMessage)
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

  const isActive = status === 'submitted' || status === 'streaming'

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
