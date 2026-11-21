export type SpeechRate = 0.75 | 1 | 1.25

export interface VoicePreferences {
  voiceURI: string | null
  rate: SpeechRate
  autoSpeak: boolean
  autoSendTranscript: boolean
}

export const SPEECH_RATES: readonly SpeechRate[] = [0.75, 1, 1.25]

export const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  voiceURI: null,
  rate: 1,
  autoSpeak: false,
  autoSendTranscript: true,
}

const STORAGE_KEY = 'voicePreferences'

function isSpeechRate(value: unknown): value is SpeechRate {
  return value === 0.75 || value === 1 || value === 1.25
}

export function loadVoicePreferences(): VoicePreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_VOICE_PREFERENCES }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_VOICE_PREFERENCES }

    const parsed = JSON.parse(raw) as Partial<Record<keyof VoicePreferences, unknown>>
    return {
      voiceURI: typeof parsed.voiceURI === 'string' && parsed.voiceURI.trim() ? parsed.voiceURI : null,
      rate: isSpeechRate(parsed.rate) ? parsed.rate : DEFAULT_VOICE_PREFERENCES.rate,
      autoSpeak: typeof parsed.autoSpeak === 'boolean' ? parsed.autoSpeak : DEFAULT_VOICE_PREFERENCES.autoSpeak,
      autoSendTranscript:
        typeof parsed.autoSendTranscript === 'boolean'
          ? parsed.autoSendTranscript
          : DEFAULT_VOICE_PREFERENCES.autoSendTranscript,
    }
  } catch {
    return { ...DEFAULT_VOICE_PREFERENCES }
  }
}

export function saveVoicePreferences(preferences: VoicePreferences): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Ignore storage quota or privacy-mode errors
  }
}
