'use client'

import type { UIMessage } from 'ai'

interface MessageListProps {
  messages: UIMessage[]
  isStreaming: boolean
}

export default function MessageList({ messages, isStreaming }: MessageListProps) {
  return (
    <div className='message-list'>
      {messages.length === 0 && (
        <div className='empty-state'>
          <p>Start the conversation by typing a message below.</p>
        </div>
      )}
      {messages.map(message => (
        <div
          key={message.id}
          className={`message message-${message.role}`}>
          <div className='message-role'>{message.role === 'user' ? 'You' : 'Coach'}</div>
          <div className='message-content'>
            {message.parts.map((part, i) => {
              if (part.type === 'text') {
                return <p key={i}>{part.text}</p>
              }
              return null
            })}
          </div>
        </div>
      ))}
      {isStreaming && (
        <div className='message message-assistant'>
          <div className='message-role'>Coach</div>
          <div className='message-content typing-indicator'>
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
    </div>
  )
}
