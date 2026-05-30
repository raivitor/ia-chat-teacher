import { render, screen } from '@testing-library/react'
import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'

import MessageList from './MessageList'

function makeMessage(id: string, role: 'user' | 'assistant', text: string): UIMessage {
  return { id, role, parts: [{ type: 'text', text }] } as UIMessage
}

describe('MessageList', () => {
  it('shows empty state when no messages', () => {
    render(
      <MessageList
        messages={[]}
        isStreaming={false}
      />,
    )

    expect(screen.getByText(/Start the conversation/)).toBeInTheDocument()
  })

  it('renders user and assistant messages', () => {
    const messages = [makeMessage('1', 'user', 'Hello'), makeMessage('2', 'assistant', 'Hi there')]
    render(
      <MessageList
        messages={messages}
        isStreaming={false}
      />,
    )

    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Coach')).toBeInTheDocument()
    expect(screen.getByText('Hi there')).toBeInTheDocument()
  })

  it('shows typing indicator when isStreaming is true', () => {
    render(
      <MessageList
        messages={[]}
        isStreaming={true}
      />,
    )

    expect(screen.getByText('Coach')).toBeInTheDocument()
    const typingIndicator = document.querySelector('.typing-indicator')
    expect(typingIndicator).toBeInTheDocument()
  })

  it('does not show typing indicator when isStreaming is false', () => {
    render(
      <MessageList
        messages={[]}
        isStreaming={false}
      />,
    )

    const typingIndicator = document.querySelector('.typing-indicator')
    expect(typingIndicator).not.toBeInTheDocument()
  })

  it('does not render non-text parts', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant' as const,
        parts: [{ type: 'tool-call', toolCallId: 'tc-1' }],
      } as unknown as UIMessage,
    ]
    render(
      <MessageList
        messages={messages}
        isStreaming={false}
      />,
    )

    // tool-call parts return null — only the role label should appear
    expect(screen.getByText('Coach')).toBeInTheDocument()
  })
})
