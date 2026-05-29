'use client'

import { useRef } from 'react'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
}

export default function MessageInput({ value, onChange, onSubmit, disabled }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) {
        onSubmit()
      }
    }
  }

  return (
    <div className='message-input'>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={
          disabled ? 'Waiting for response...' : 'Type your message... (Enter to send, Shift+Enter for new line)'
        }
        rows={3}
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        type='button'>
        Send
      </button>
    </div>
  )
}
