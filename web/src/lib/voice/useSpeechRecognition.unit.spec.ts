import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mapSpeechRecognitionError, useSpeechRecognition } from './useSpeechRecognition'

describe('mapSpeechRecognitionError', () => {
  it('maps common browser error codes to Portuguese messages', () => {
    expect(mapSpeechRecognitionError('not-allowed')).toContain('Permissão')
    expect(mapSpeechRecognitionError('no-speech')).toContain('Nenhuma fala')
    expect(mapSpeechRecognitionError('network')).toContain('conexão')
    expect(mapSpeechRecognitionError('aborted')).toBe('')
  })
})

describe('useSpeechRecognition', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports unsupported when browser has no SpeechRecognition', () => {
    const { result } = renderHook(() => useSpeechRecognition())

    expect(result.current.isSupported).toBe(false)
    expect(result.current.isListening).toBe(false)
  })

  it('emits interim and final transcripts and handles errors', () => {
    const mockInstance: {
      lang: string
      continuous: boolean
      interimResults: boolean
      onresult: ((event: unknown) => void) | null
      onerror: ((event: { error: string }) => void) | null
      onend: (() => void) | null
      start: ReturnType<typeof vi.fn>
      stop: ReturnType<typeof vi.fn>
      abort: ReturnType<typeof vi.fn>
    } = {
      lang: '',
      continuous: false,
      interimResults: false,
      onresult: null,
      onerror: null,
      onend: null,
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
    }

    const MockRecognition = vi.fn(function () {
      return mockInstance
    })

    vi.stubGlobal('webkitSpeechRecognition', MockRecognition)

    const onFinal = vi.fn()
    const { result } = renderHook(() => useSpeechRecognition())

    expect(result.current.isSupported).toBe(true)

    act(() => {
      result.current.start(onFinal)
    })

    expect(result.current.isListening).toBe(true)
    expect(mockInstance.lang).toBe('en-US')

    act(() => {
      mockInstance.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: false, 0: { transcript: 'I like' } }],
      })
    })
    expect(result.current.interimTranscript).toBe('I like')

    act(() => {
      mockInstance.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'I like coffee' } }],
      })
    })
    expect(onFinal).toHaveBeenCalledWith('I like coffee')
    expect(result.current.interimTranscript).toBe('')

    act(() => {
      mockInstance.onerror?.({ error: 'no-speech' })
    })
    expect(result.current.error).toContain('Nenhuma fala')
    expect(result.current.isListening).toBe(false)
  })
})
