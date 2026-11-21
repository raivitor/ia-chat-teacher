'use client'

import type { UIMessage } from 'ai'
import { useEffect, useRef } from 'react'

import { formatTextForSpeech } from '../../lib/voice/useSpeechSynthesis'

interface MessageListProps {
  messages: UIMessage[]
  isWaitingResponse: boolean
  assistantName?: string
  ttsSupported?: boolean
  speakingMessageId?: string | null
  onSpeak?: (text: string, messageId: string) => void
  onStopSpeaking?: () => void
}

interface SearchResultItem {
  title?: string
  url?: string
}

const CORRECTION_TIP_PATTERN = /(\((?:Small tip|One note|Quick tip|Tip|Note):[^)]*\))/gi

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function renderFormattedText(text: string, highlightTips: boolean) {
  const paragraphs = text.split(/\n+/).filter(Boolean)

  return paragraphs.map((paragraph, paragraphIndex) => {
    if (!highlightTips) {
      return <p key={paragraphIndex}>{paragraph}</p>
    }

    const segments = paragraph.split(CORRECTION_TIP_PATTERN)
    return (
      <p key={paragraphIndex}>
        {segments.map((segment, segmentIndex) =>
          segmentIndex % 2 === 1 ? (
            <span
              key={segmentIndex}
              className='correction-tip'>
              {segment}
            </span>
          ) : (
            segment
          ),
        )}
      </p>
    )
  })
}

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter(part => part.type === 'text')
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('\n')
    .trim()
}

export default function MessageList({
  messages,
  isWaitingResponse,
  assistantName = 'Coach',
  ttsSupported = false,
  speakingMessageId = null,
  onSpeak,
  onStopSpeaking,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = listRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages, isWaitingResponse])

  return (
    <div
      ref={listRef}
      className='message-list'>
      {messages.length === 0 && (
        <div className='empty-state'>
          <p>Comece a conversa digitando sua mensagem abaixo.</p>
        </div>
      )}
      {messages.map(message => {
        const messageText = message.role === 'assistant' ? getMessageText(message) : ''
        const canSpeak =
          message.role === 'assistant' &&
          ttsSupported &&
          Boolean(onSpeak) &&
          formatTextForSpeech(messageText).length > 0
        const isSpeaking = speakingMessageId === message.id

        return (
          <div
            key={message.id}
            className={`message message-${message.role} ${isSpeaking ? 'message-speaking' : ''}`}>
            <div className='message-header'>
              <span className='message-role'>{message.role === 'user' ? 'Você' : assistantName}</span>
              {canSpeak && (
                <button
                  type='button'
                  className={`speak-btn ${isSpeaking ? 'speaking' : ''}`}
                  onClick={() => {
                    if (isSpeaking) {
                      onStopSpeaking?.()
                    } else {
                      onSpeak?.(messageText, message.id)
                    }
                  }}>
                  {isSpeaking ? 'Parar áudio' : 'Ouvir'}
                </button>
              )}
            </div>
            <div className='message-content'>
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  return <div key={i}>{renderFormattedText(part.text, message.role === 'assistant')}</div>
                }

                if (part.type.startsWith('tool-') && 'state' in part) {
                  if (part.state === 'input-available' || part.state === 'input-streaming') {
                    const query = (part as { input?: { query?: string } }).input?.query
                    return (
                      <p
                        key={i}
                        className='tool-searching'>
                        🔍 Pesquisando: {query ?? '...'}
                      </p>
                    )
                  }

                  if (part.state === 'output-available') {
                    const output = (part as { output?: unknown }).output
                    const sources = Array.isArray(output)
                      ? (output as SearchResultItem[]).filter(
                          (item): item is { title: string; url: string } =>
                            typeof item?.url === 'string' && isSafeHttpUrl(item.url),
                        )
                      : []

                    if (sources.length === 0) return null

                    return (
                      <div
                        key={i}
                        className='tool-sources'>
                        <span className='tool-sources-label'>Fontes consultadas:</span>
                        <ul>
                          {sources.map((source, sourceIndex) => (
                            <li key={sourceIndex}>
                              <a
                                href={source.url}
                                target='_blank'
                                rel='noopener noreferrer'>
                                {source.title || source.url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  }
                }

                return null
              })}
            </div>
          </div>
        )
      })}
      {isWaitingResponse && (
        <div className='message message-assistant'>
          <div className='message-role'>{assistantName}</div>
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
