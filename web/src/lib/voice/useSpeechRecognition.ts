'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0?: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionErrorEventLike {
  error: string
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

export interface SpeechRecognitionController {
  isSupported: boolean
  isListening: boolean
  interimTranscript: string
  error: string | null
  start: (onFinalTranscript: (transcript: string) => void) => void
  stop: () => void
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const win = window as WindowWithSpeechRecognition
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null
}

export function mapSpeechRecognitionError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Permissão do microfone negada no navegador.'
    case 'no-speech':
      return 'Nenhuma fala foi detectada. Tente falar mais perto do microfone.'
    case 'audio-capture':
      return 'Nenhum microfone foi encontrado neste dispositivo.'
    case 'network':
      return 'Erro de conexão no reconhecimento de voz.'
    case 'aborted':
      return ''
    default:
      return 'Não foi possível transcrever o áudio. Tente novamente.'
  }
}

export function useSpeechRecognition(): SpeechRecognitionController {
  const isSupported = getSpeechRecognitionConstructor() !== null
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  const start = useCallback((onFinalTranscript: (transcript: string) => void) => {
    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition) return

    recognitionRef.current?.abort()
    setError(null)
    setInterimTranscript('')

    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = event => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = result?.[0]?.transcript ?? ''
        if (result?.isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }

      setInterimTranscript(interimText.trim())

      if (finalText.trim()) {
        setInterimTranscript('')
        onFinalTranscript(finalText.trim())
      }
    }

    recognition.onerror = event => {
      const message = mapSpeechRecognitionError(event.error)
      if (message) {
        setError(message)
      }
      setIsListening(false)
      setInterimTranscript('')
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }
    }

    recognitionRef.current = recognition
    setIsListening(true)
    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setIsListening(false)
      setError('Não foi possível iniciar o microfone. Tente novamente.')
    }
  }, [])

  return {
    isSupported,
    isListening,
    interimTranscript,
    error,
    start,
    stop,
  }
}
