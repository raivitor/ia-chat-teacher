export const DEVELOPMENT_DEFAULT_MODEL = 'google/gemma-4-31b-it:free'
export const PRODUCTION_RECOMMENDED_MODEL = 'google/gemma-4-31b-it:free'

// Fallback: use when the primary model or its routed providers are unavailable.
export const FALLBACK_MODEL = 'google/gemma-4-26b-a4b-it:free'

export const DEFAULT_MODEL =
  process.env.OPENROUTER_DEFAULT_MODEL ??
  (process.env.NODE_ENV === 'production' ? PRODUCTION_RECOMMENDED_MODEL : DEVELOPMENT_DEFAULT_MODEL)

export const AVAILABLE_MODELS = [
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 (31B) - Free', contextWindow: 262_144 },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    name: 'Gemma 4 (26B A4B) - Free',
    contextWindow: 262_144,
  },
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
