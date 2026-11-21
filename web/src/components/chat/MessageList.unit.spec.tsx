import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UIMessage } from 'ai'
import { describe, expect, it, vi } from 'vitest'

import MessageList from './MessageList'

function makeMessage(id: string, role: 'user' | 'assistant', text: string): UIMessage {
  return { id, role, parts: [{ type: 'text', text }] } as UIMessage
}

describe('MessageList', () => {
  it('shows empty state in Portuguese when no messages', () => {
    render(
      <MessageList
        messages={[]}
        isWaitingResponse={false}
      />,
    )

    expect(screen.getByText(/Comece a conversa digitando sua mensagem abaixo/)).toBeInTheDocument()
  })

  it('renders user and assistant messages with persona name', () => {
    const messages = [makeMessage('1', 'user', 'Hello'), makeMessage('2', 'assistant', 'Hi there')]
    render(
      <MessageList
        messages={messages}
        isWaitingResponse={false}
        assistantName='Aria'
      />,
    )

    expect(screen.getByText('Você')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Aria')).toBeInTheDocument()
    expect(screen.getByText('Hi there')).toBeInTheDocument()
  })

  it('highlights correction tips only inside assistant messages', () => {
    const messages = [
      makeMessage('1', 'user', 'Check this (Tip: user text)'),
      makeMessage('2', 'assistant', 'Nice cat! (Small tip: say "I have a cat.")'),
    ]
    const { container } = render(
      <MessageList
        messages={messages}
        isWaitingResponse={false}
      />,
    )

    const tips = container.querySelectorAll('.correction-tip')
    expect(tips).toHaveLength(1)
    expect(tips[0]).toHaveTextContent('(Small tip: say "I have a cat.")')
  })

  it('renders web search sources when tool output is available', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant' as const,
        parts: [
          {
            type: 'tool-webSearch',
            toolCallId: 'tc-1',
            state: 'output-available',
            output: [{ title: 'BBC Learning English', url: 'https://www.bbc.co.uk/learningenglish' }],
          },
          { type: 'text', text: 'Here is what I found.' },
        ],
      } as unknown as UIMessage,
    ]
    render(
      <MessageList
        messages={messages}
        isWaitingResponse={false}
      />,
    )

    expect(screen.getByText('Fontes consultadas:')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'BBC Learning English' })
    expect(link).toHaveAttribute('href', 'https://www.bbc.co.uk/learningenglish')
  })

  it('shows typing indicator when isWaitingResponse is true', () => {
    render(
      <MessageList
        messages={[]}
        isWaitingResponse={true}
        assistantName='Jamie'
      />,
    )

    expect(screen.getByText('Jamie')).toBeInTheDocument()
    const typingIndicator = document.querySelector('.typing-indicator')
    expect(typingIndicator).toBeInTheDocument()
  })

  it('does not show typing indicator when isWaitingResponse is false', () => {
    render(
      <MessageList
        messages={[]}
        isWaitingResponse={false}
      />,
    )

    const typingIndicator = document.querySelector('.typing-indicator')
    expect(typingIndicator).not.toBeInTheDocument()
  })

  it('renders speak button on assistant messages when ttsSupported is true', async () => {
    const onSpeak = vi.fn()
    const messages = [makeMessage('1', 'assistant', 'How was your day? (Small tip: say "went")')]

    render(
      <MessageList
        messages={messages}
        isWaitingResponse={false}
        ttsSupported={true}
        onSpeak={onSpeak}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Ouvir' }))
    expect(onSpeak).toHaveBeenCalledWith('How was your day? (Small tip: say "went")', '1')
  })
})
