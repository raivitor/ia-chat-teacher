type JsonValue = null | string | number | boolean | JsonObject | JsonArray
type JsonArray = JsonValue[]
type JsonObject = { [key: string]: JsonValue | undefined }

export interface BuildOpenRouterProviderOptionsInput {
  conversationId: string
  primaryModel: string
  fallbackModel?: string
  includeUsage?: boolean
}

interface OpenRouterOptions extends JsonObject {
  session_id: string
  provider: {
    sort: 'latency'
    allow_fallbacks: true
  }
  reasoning: {
    effort: 'none'
  }
  models: string[]
  usage?: {
    include: true
  }
}

export type OpenRouterChatProviderOptions = Record<string, JsonObject> & {
  openrouter: OpenRouterOptions
}

export function uniqueModels(models: Array<string | undefined>): string[] {
  return [...new Set(models.filter(Boolean) as string[])]
}

export function buildOpenRouterProviderOptions({
  conversationId,
  primaryModel,
  fallbackModel,
  includeUsage = true,
}: BuildOpenRouterProviderOptionsInput): OpenRouterChatProviderOptions {
  return {
    openrouter: {
      session_id: conversationId,
      provider: {
        sort: 'latency',
        allow_fallbacks: true,
      },
      reasoning: { effort: 'none' },
      models: uniqueModels([primaryModel, fallbackModel]),
      ...(includeUsage ? { usage: { include: true } } : {}),
    },
  }
}
