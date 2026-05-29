export const DEFAULT_MODEL = 'google/gemma-4-31b-it:free'

// Paid fallback — use when the free-tier model is unavailable or for production environments
// that require guaranteed uptime without depending on free tier availability.
export const FALLBACK_MODEL = 'deepseek/deepseek-v4-flash'

export const AVAILABLE_MODELS = [
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 (31B) - Free', contextWindow: 262_144 },
  {
    id: 'deepseek/deepseek-v4-flash:free',
    name: 'DeepSeek V4 Flash - Free',
    contextWindow: 1_048_576,
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    name: 'Gemma 4 (26B A4B) - Free',
    contextWindow: 262_144,
  },
  { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash', contextWindow: 1_048_576 },
]

export const DEFAULT_GENERATION_PARAMS = {
  maxOutputTokens: 1024,
  temperature: 0.7,
} as const
