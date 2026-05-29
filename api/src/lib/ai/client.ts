import { createOpenRouter } from '@openrouter/ai-sdk-provider'

import { DEFAULT_MODEL } from './config.js'

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY environment variable is not set. ' +
        'Set it in your .env file or environment to use the AI features.',
    )
  }

  return createOpenRouter({ apiKey })
}

export function getChatModel(modelId?: string) {
  const client = getOpenRouterClient()
  return client(modelId ?? DEFAULT_MODEL)
}
