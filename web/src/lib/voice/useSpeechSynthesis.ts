'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const CORRECTION_BLOCK_PATTERN = /\((?:Small tip|One note|Quick tip|Tip|Note):[^)]*\)/gi

export interface SpeakOptions {
  voiceURI: string | null
  rate: number
}

export interface SpeechSynthesisController {
  isSupported: boolean
  voices: SpeechSynthesisVoice[]
  speakingMessageId: string | null
  speak: (text: string, messageId: string, options: SpeakOptions) => void
  stop: () => void
}

export function formatTextForSpeech(text: string): string {
  return text.replaceAll(CORRECTION_BLOCK_PATTERN, ' ').replaceAll(/\s+/g, ' ').trim()
}

function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return []
  }

  const allVoices = window.speechSynthesis.getVoices()
  return allVoices
    .filter(voice => voice.lang.toLowerCase().startsWith('en'))
    .sort((a, b) => {
      const aIsUs = a.lang.toLowerCase() === 'en-us' ? 0 : 1
      const bIsUs = b.lang.toLowerCase() === 'en-us' ? 0 : 1
      if (aIsUs !== bIsUs) return aIsUs - bIsUs
      return a.name.localeCompare(b.name)
    })
}

export function useSpeechSynthesis(): SpeechSynthesisController {
  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getEnglishVoices())
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (!isSupported) return

    const synth = window.speechSynthesis
    const handleVoicesChanged = () => {
      setVoices(getEnglishVoices())
    }

    synth.addEventListener?.('voiceschanged', handleVoicesChanged)
    return () => {
      synth.removeEventListener?.('voiceschanged', handleVoicesChanged)
      utteranceRef.current = null
      synth.cancel()
    }
  }, [isSupported])

  const stop = useCallback(() => {
    if (!isSupported) return
    utteranceRef.current = null
    window.speechSynthesis.cancel()
    setSpeakingMessageId(null)
  }, [isSupported])

  const speak = useCallback(
    (text: string, messageId: string, options: SpeakOptions) => {
      if (!isSupported) return

      const cleanedText = formatTextForSpeech(text)
      if (!cleanedText) return

      const synth = window.speechSynthesis
      synth.cancel()

      const utterance = new SpeechSynthesisUtterance(cleanedText)
      utterance.lang = 'en-US'
      utterance.rate = options.rate

      const availableVoices = voices.length > 0 ? voices : getEnglishVoices()
      const selectedVoice =
        (options.voiceURI ? availableVoices.find(voice => voice.voiceURI === options.voiceURI) : undefined) ??
        availableVoices[0]

      if (selectedVoice) {
        utterance.voice = selectedVoice
        utterance.lang = selectedVoice.lang
      }

      const handleFinish = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null
        }
        setSpeakingMessageId(current => (current === messageId ? null : current))
      }

      utterance.onend = handleFinish
      utterance.onerror = handleFinish

      // Keep a strong ref while speaking so Chromium does not GC the utterance before onend fires
      utteranceRef.current = utterance
      setSpeakingMessageId(messageId)
      synth.speak(utterance)
    },
    [isSupported, voices],
  )

  return {
    isSupported,
    voices,
    speakingMessageId,
    speak,
    stop,
  }
}
