'use client'

import type { UIMessage } from 'ai'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'

import { api, type AIModel, type ConversationWithMessages } from '../../lib/api'
import { CONVERSATIONS_CHANGED_EVENT, notifyConversationsChanged, PROFILE_META } from '../../lib/profiles'
import { useSpeechRecognition } from '../../lib/voice/useSpeechRecognition'
import { useSpeechSynthesis } from '../../lib/voice/useSpeechSynthesis'
import {
  loadVoicePreferences,
  saveVoicePreferences,
  SPEECH_RATES,
  type VoicePreferences,
} from '../../lib/voice/voicePreferences'
import MessageInput from './MessageInput'
import MessageList, { getMessageText } from './MessageList'

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
  modelsById: Record<string, AIModel>
}

function ChatSession({ conversationId, initialConversation, modelsById }: ChatSessionProps) {
  const [conversation, setConversation] = useState(initialConversation)
  const [initialMessages] = useState(() =>
    initialConversation.messages.filter(m => m.role !== 'system').map(dbMessageToUIMessage),
  )
  const [inputValue, setInputValue] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [voicePanelOpen, setVoicePanelOpen] = useState(false)
  const [voicePrefs, setVoicePrefs] = useState<VoicePreferences>(loadVoicePreferences)
  const prevStatusRef = useRef<string>('')
  const prevSpeakStatusRef = useRef<string>('')

  const tts = useSpeechSynthesis()
  const stt = useSpeechRecognition()
  const { isSupported: ttsSupported, speak: speakText } = tts

  const { messages, status, error, sendMessage, stop, regenerate } = useChat({
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

  // Auto-speak the latest assistant response when streaming finishes
  useEffect(() => {
    const justFinishedStreaming = prevSpeakStatusRef.current === 'streaming' && status === 'ready'
    prevSpeakStatusRef.current = status

    if (!justFinishedStreaming || !voicePrefs.autoSpeak || !ttsSupported) return

    const lastAssistant = messages.findLast(m => m.role === 'assistant')
    if (!lastAssistant) return

    const text = getMessageText(lastAssistant)
    if (text) {
      speakText(text, lastAssistant.id, { voiceURI: voicePrefs.voiceURI, rate: voicePrefs.rate })
    }
  }, [status, messages, voicePrefs.autoSpeak, voicePrefs.voiceURI, voicePrefs.rate, ttsSupported, speakText])

  const isActive = status === 'submitted' || status === 'streaming'
  const isFinished = conversation.finishedAt !== null
  const isWaitingReview = isFinished && conversation.reviewedAt === null
  const profileMeta = PROFILE_META[conversation.profile] ?? PROFILE_META.professor
  const modelInfo = modelsById[conversation.model]
  const contextWindow = modelInfo?.contextWindow ?? null

  // Sync reviewed status if review is generated from the sidebar while this conversation is open
  useEffect(() => {
    if (!isWaitingReview) return

    let cancelled = false
    const handleSync = () => {
      api
        .getConversation(conversationId)
        .then(updated => {
          if (!cancelled) setConversation(updated)
        })
        .catch(() => undefined)
    }

    window.addEventListener(CONVERSATIONS_CHANGED_EVENT, handleSync)
    return () => {
      cancelled = true
      window.removeEventListener(CONVERSATIONS_CHANGED_EVENT, handleSync)
    }
  }, [conversationId, isWaitingReview])

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

  function updateVoicePrefs(patch: Partial<VoicePreferences>) {
    setVoicePrefs(prev => {
      const next = { ...prev, ...patch }
      saveVoicePreferences(next)
      return next
    })
  }

  async function handleSubmit() {
    if (!inputValue.trim() || isActive || isFinished) return
    const text = inputValue
    setInputValue('')
    await sendMessage({ text })
  }

  function handleToggleListening() {
    if (isActive || isFinished) return

    if (stt.isListening) {
      stt.stop()
      return
    }

    tts.stop()
    stt.start(transcript => {
      const trimmed = transcript.trim()
      if (!trimmed) return

      if (voicePrefs.autoSendTranscript) {
        const combined = inputValue.trim() ? `${inputValue.trim()} ${trimmed}` : trimmed
        setInputValue('')
        void sendMessage({ text: combined })
      } else {
        setInputValue(prev => (prev.trim() ? `${prev.trimEnd()} ${trimmed}` : trimmed))
      }
    })
  }

  async function handleToggleFinish() {
    stt.stop()
    tts.stop()
    setActionLoading(true)
    setActionError(null)
    try {
      const updated = isFinished
        ? await api.reopenConversation(conversationId)
        : await api.finishConversation(conversationId)
      setConversation(prev => ({ ...prev, ...updated }))
      notifyConversationsChanged()
    } catch {
      setActionError(isFinished ? 'Não foi possível reabrir a conversa.' : 'Não foi possível finalizar a conversa.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className='chat-interface'>
      <header className='chat-header'>
        <div className='chat-header-info'>
          <h2 className='chat-header-title'>{conversation.title}</h2>
          <div className='chat-meta-badges'>
            <span className='meta-badge meta-badge-level'>Nível {conversation.level}</span>
            <span className='meta-badge'>{profileMeta.label}</span>
            <span className='meta-badge'>{modelInfo?.name ?? conversation.model}</span>
            {conversation.webSearchEnabled && <span className='meta-badge meta-badge-web'>Busca na Web</span>}
            {isFinished && (
              <span className={`meta-badge ${conversation.reviewedAt ? 'meta-badge-reviewed' : 'meta-badge-pending'}`}>
                {conversation.reviewedAt ? 'Revisada' : 'Aguardando revisão'}
              </span>
            )}
          </div>
        </div>
        <div className='chat-header-actions'>
          <button
            type='button'
            className={`voice-toggle-btn ${voicePanelOpen ? 'active' : ''}`}
            aria-expanded={voicePanelOpen}
            onClick={() => setVoicePanelOpen(prev => !prev)}>
            Voz
          </button>
          <button
            type='button'
            className={isFinished ? 'reopen-btn' : 'finish-btn'}
            disabled={isActive || actionLoading || (!isFinished && messages.length === 0)}
            title={!isFinished && messages.length === 0 ? 'Envie ao menos uma mensagem antes de finalizar' : undefined}
            onClick={() => {
              void handleToggleFinish()
            }}>
            {actionLoading ? 'Salvando...' : isFinished ? 'Reabrir conversa' : 'Finalizar conversa'}
          </button>
        </div>
      </header>
      {voicePanelOpen && (
        <div className='voice-panel'>
          <label className='voice-field'>
            <span>Voz (inglês):</span>
            <select
              value={voicePrefs.voiceURI ?? ''}
              disabled={!tts.isSupported || tts.voices.length === 0}
              onChange={e => updateVoicePrefs({ voiceURI: e.target.value || null })}>
              <option value=''>{tts.voices.length > 0 ? 'Automática (inglês)' : 'Voz padrão do navegador'}</option>
              {tts.voices.map(voice => (
                <option
                  key={voice.voiceURI}
                  value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </label>
          <div className='voice-field'>
            <span>Velocidade:</span>
            <div className='voice-rate-group'>
              {SPEECH_RATES.map(rate => (
                <button
                  key={rate}
                  type='button'
                  className={`voice-rate-btn ${voicePrefs.rate === rate ? 'selected' : ''}`}
                  onClick={() => updateVoicePrefs({ rate })}>
                  {rate}x
                </button>
              ))}
            </div>
          </div>
          <label className='voice-checkbox'>
            <input
              type='checkbox'
              checked={voicePrefs.autoSpeak}
              disabled={!tts.isSupported}
              onChange={e => updateVoicePrefs({ autoSpeak: e.target.checked })}
            />
            <span>Ler respostas automaticamente</span>
          </label>
          <label className='voice-checkbox'>
            <input
              type='checkbox'
              checked={voicePrefs.autoSendTranscript}
              disabled={!stt.isSupported}
              onChange={e => updateVoicePrefs({ autoSendTranscript: e.target.checked })}
            />
            <span>Enviar ao terminar de falar</span>
          </label>
        </div>
      )}
      {actionError && <div className='stream-error'>{actionError}</div>}
      {error && (
        <div className='stream-error'>
          <span>Erro ao gerar resposta: {error.message}</span>
          <button
            type='button'
            className='retry-btn'
            onClick={() => {
              void regenerate()
            }}>
            Tentar novamente
          </button>
        </div>
      )}
      <MessageList
        messages={messages}
        isWaitingResponse={status === 'submitted'}
        assistantName={profileMeta.name}
        ttsSupported={tts.isSupported}
        speakingMessageId={tts.speakingMessageId}
        onSpeak={(text, messageId) => {
          tts.speak(text, messageId, { voiceURI: voicePrefs.voiceURI, rate: voicePrefs.rate })
        }}
        onStopSpeaking={tts.stop}
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
        disabled={isActive || isFinished}
        isStreaming={isActive}
        onStop={() => {
          stt.stop()
          tts.stop()
          void stop()
        }}
        finished={isFinished}
        sttSupported={stt.isSupported}
        isListening={stt.isListening}
        interimTranscript={stt.interimTranscript}
        voiceError={stt.error}
        onToggleListening={handleToggleListening}
      />
    </div>
  )
}

type LoadState =
  | {
      conversationId: string
      status: 'loaded'
      conversation: ConversationWithMessages
      modelsById: Record<string, AIModel>
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
          modelsById: Object.fromEntries(models.map(m => [m.id, m])),
        })
      })
      .catch(() => {
        if (cancelled) return

        setLoadState({
          conversationId,
          status: 'error',
          error: 'Não foi possível carregar o histórico da conversa.',
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
      modelsById={loadState.modelsById}
    />
  )
}
