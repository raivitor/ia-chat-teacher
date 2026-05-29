export const DEFAULT_MODEL = 'google/gemma-4-31b-it:free'

export const AVAILABLE_MODELS = [
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 (31B) - Free' },
  { id: 'deepseek/deepseek-v4-flash:free', name: 'DeepSeek V4 Flash - Free' },
  { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 (26B A4B) - Free' },
  { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
]

export const DEFAULT_GENERATION_PARAMS = {
  maxOutputTokens: 1024,
  temperature: 0.7,
} as const
