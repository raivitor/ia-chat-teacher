'use client'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  isStreaming?: boolean
  onStop?: () => void
  finished?: boolean
}

export default function MessageInput({
  value,
  onChange,
  onSubmit,
  disabled,
  isStreaming = false,
  onStop,
  finished = false,
}: MessageInputProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) {
        onSubmit()
      }
    }
  }

  const placeholder = finished
    ? 'Esta conversa foi finalizada. Reabra para continuar escrevendo.'
    : isStreaming
      ? 'Aguardando resposta...'
      : 'Digite sua mensagem em inglês... (Enter para enviar, Shift+Enter para quebrar linha)'

  return (
    <div className='message-input'>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={3}
      />
      {isStreaming && onStop ? (
        <button
          onClick={onStop}
          className='stop-btn'
          type='button'>
          Parar
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          type='button'>
          Enviar
        </button>
      )}
    </div>
  )
}
