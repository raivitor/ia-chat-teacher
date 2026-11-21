import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatTextForSpeech, useSpeechSynthesis } from './useSpeechSynthesis'

describe('formatTextForSpeech', () => {
  it('removes correction tip blocks so only the conversational reply is spoken', () => {
    expect(formatTextForSpeech('Aww, what is your cat name? (Small tip: say "I have a cat.")')).toBe(
      'Aww, what is your cat name?',
    )
    expect(formatTextForSpeech('Great point! (One note: use "since" here.) How long have you worked there?')).toBe(
      'Great point! How long have you worked there?',
    )
  })

  it('returns empty string when text contains only a correction block', () => {
    expect(formatTextForSpeech('(Small tip: say "I have")')).toBe('')
  })
})

describe('useSpeechSynthesis', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('filters English voices, speaks cleaned text with chosen rate, and stops cleanly', () => {
    const englishVoice = { name: 'Google US English', lang: 'en-US', voiceURI: 'en-us-1' } as SpeechSynthesisVoice
    const portugueseVoice = { name: 'Português', lang: 'pt-BR', voiceURI: 'pt-br-1' } as SpeechSynthesisVoice
    const spokenUtterances: Array<{ text: string; rate: number; voice?: SpeechSynthesisVoice; onend?: () => void }> = []

    const mockSynth = {
      getVoices: vi.fn(() => [portugueseVoice, englishVoice]),
      speak: vi.fn((utterance: { text: string; rate: number; voice?: SpeechSynthesisVoice; onend?: () => void }) => {
        spokenUtterances.push(utterance)
      }),
      cancel: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    class MockUtterance {
      text: string
      lang = ''
      rate = 1
      voice?: SpeechSynthesisVoice
      onend?: () => void
      onerror?: () => void
      constructor(text: string) {
        this.text = text
      }
    }

    vi.stubGlobal('speechSynthesis', mockSynth)
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance)

    const { result } = renderHook(() => useSpeechSynthesis())

    expect(result.current.isSupported).toBe(true)
    expect(result.current.voices).toEqual([englishVoice])

    act(() => {
      result.current.speak('Hello there! (Small tip: say hi)', 'msg-1', { voiceURI: 'en-us-1', rate: 0.75 })
    })

    expect(mockSynth.speak).toHaveBeenCalledOnce()
    expect(spokenUtterances[0]?.text).toBe('Hello there!')
    expect(spokenUtterances[0]?.rate).toBe(0.75)
    expect(spokenUtterances[0]?.voice).toBe(englishVoice)
    expect(result.current.speakingMessageId).toBe('msg-1')

    act(() => {
      spokenUtterances[0]?.onend?.()
    })
    expect(result.current.speakingMessageId).toBeNull()

    act(() => {
      result.current.stop()
    })
    expect(mockSynth.cancel).toHaveBeenCalled()
  })
})
