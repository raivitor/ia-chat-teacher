export const DEVELOPMENT_DEFAULT_MODEL = 'google/gemini-3.8-flash'
export const PRODUCTION_RECOMMENDED_MODEL = 'google/gemini-3.8-flash'

// Fallback: use when the primary model or its routed providers are unavailable.
export const FALLBACK_MODEL = 'google/gemini-3.1-flash-lite'

export const DEFAULT_MODEL =
  process.env.OPENROUTER_DEFAULT_MODEL ??
  (process.env.NODE_ENV === 'production' ? PRODUCTION_RECOMMENDED_MODEL : DEVELOPMENT_DEFAULT_MODEL)

export const AVAILABLE_MODELS = [
  { id: 'google/gemini-3.8-flash', name: 'Gemini 3.8 Flash (Padrão)', contextWindow: 1_048_576 },
  {
    id: 'google/gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite (Rápido / Econômico)',
    contextWindow: 1_048_576,
  },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B (Gratuito)', contextWindow: 262_144 },
] as const

const ALLOWED_MODEL_IDS = new Set<string>(AVAILABLE_MODELS.map(model => model.id))

export function isAllowedModel(modelId: string): boolean {
  return ALLOWED_MODEL_IDS.has(modelId)
}

export const MAX_HISTORY_MESSAGES = 40

export const DEFAULT_GENERATION_PARAMS = {
  maxOutputTokens: 1024,
  temperature: 0.7,
} as const
