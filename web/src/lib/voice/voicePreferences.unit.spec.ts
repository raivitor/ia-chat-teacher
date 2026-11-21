import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_VOICE_PREFERENCES, loadVoicePreferences, saveVoicePreferences } from './voicePreferences'

beforeEach(() => {
  localStorage.clear()
})

describe('voicePreferences', () => {
  it('returns default preferences when localStorage is empty', () => {
    expect(loadVoicePreferences()).toEqual(DEFAULT_VOICE_PREFERENCES)
    expect(loadVoicePreferences().autoSendTranscript).toBe(true)
    expect(loadVoicePreferences().autoSpeak).toBe(false)
    expect(loadVoicePreferences().rate).toBe(1)
  })

  it('persists and reloads valid preferences', () => {
    const custom = {
      voiceURI: 'Google US English',
      rate: 0.75 as const,
      autoSpeak: true,
      autoSendTranscript: false,
    }
    saveVoicePreferences(custom)

    expect(loadVoicePreferences()).toEqual(custom)
  })

  it('falls back to defaults on invalid JSON or invalid field values', () => {
    localStorage.setItem('voicePreferences', 'not-json')
    expect(loadVoicePreferences()).toEqual(DEFAULT_VOICE_PREFERENCES)

    localStorage.setItem(
      'voicePreferences',
      JSON.stringify({ voiceURI: '   ', rate: 3, autoSpeak: 'yes', autoSendTranscript: 1 }),
    )
    expect(loadVoicePreferences()).toEqual(DEFAULT_VOICE_PREFERENCES)
  })
})
