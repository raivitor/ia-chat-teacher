'use client'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  isStreaming?: boolean
  onStop?: () => void
  finished?: boolean
  sttSupported?: boolean
  isListening?: boolean
  interimTranscript?: string
  voiceError?: string | null
  onToggleListening?: () => void
}

export default function MessageInput({
  value,
  onChange,
  onSubmit,
  disabled,
  isStreaming = false,
  onStop,
  finished = false,
  sttSupported = false,
  isListening = false,
  interimTranscript = '',
  voiceError = null,
  onToggleListening,
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
    : isListening
      ? 'Ouvindo em inglês... fale normalmente.'
      : isStreaming
        ? 'Aguardando resposta...'
        : 'Digite sua mensagem em inglês... (Enter para enviar, Shift+Enter para quebrar linha)'

  return (
    <div className='message-input-wrapper'>
      {voiceError && <div className='voice-error'>{voiceError}</div>}
      {isListening && (
        <div className='voice-interim'>
          <span className='voice-interim-dot' />
          <span>{interimTranscript ? `Ouvindo: "${interimTranscript}"` : 'Ouvindo... fale em inglês'}</span>
        </div>
      )}
      <div className='message-input'>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={3}
        />
        {onToggleListening && !isStreaming && (
          <button
            type='button'
            className={`mic-btn ${isListening ? 'listening' : ''}`}
            disabled={disabled || !sttSupported}
            aria-label={isListening ? 'Parar gravação' : 'Falar mensagem'}
            title={
              sttSupported
                ? isListening
                  ? 'Clique para parar de gravar'
                  : 'Falar em inglês'
                : 'Reconhecimento de voz disponível no Chrome, Edge ou Brave.'
            }
            onClick={onToggleListening}>
            {isListening ? 'Parar voz' : 'Falar'}
          </button>
        )}
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
    </div>
  )
}
