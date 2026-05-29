# Tarefa 4 — Aplicar o LLM_OPERATIONS_GUIDE ao sistema atual

## Prompt

Você é um engenheiro sênior trabalhando no projeto **ia-chat-teacher**, uma plataforma de prática de escrita em inglês que usa o **DeepSeek-V4-Flash via OpenRouter** com o **Vercel AI SDK**.

Leia os seguintes arquivos antes de agir:

- `LLM_OPERATIONS_GUIDE.md` — referência técnica de operações LLM do projeto
- `api/src/lib/ai/client.ts` — cliente OpenRouter atual
- `api/src/lib/ai/config.ts` — configuração de modelos e parâmetros
- `api/src/services/chatService.ts` — serviço de chat que chama `streamText`

Aplique as seguintes mudanças no código, em ordem de prioridade:

---

### 1. Passar `session_id` por conversa no `streamText`

No `chatService.ts`, a chamada a `streamText` não passa `providerOptions`.
Adicione `session_id: conversationId` via `providerOptions.openrouter` para habilitar sticky routing e maximizar cache hits no OpenRouter.

```ts
// Antes
const result = streamText({
  model,
  ...(systemPrompt ? { system: systemPrompt } : {}),
  messages: modelMessages,
  ...DEFAULT_GENERATION_PARAMS,
  onFinish: ...
})

// Depois
const result = streamText({
  model,
  ...(systemPrompt ? { system: systemPrompt } : {}),
  messages: modelMessages,
  ...DEFAULT_GENERATION_PARAMS,
  providerOptions: {
    openrouter: {
      session_id: conversationId,
    },
  },
  onFinish: ...
})
```

---

### 2. Desativar reasoning tokens no fluxo normal de chat

O guia determina que reasoning deve ser desativado para conversas normais (non-think mode).
Adicione a opção adequada dentro de `providerOptions.openrouter` para sinalizar ao OpenRouter/DeepSeek que não deve usar reasoning.

Consulte o `LLM_OPERATIONS_GUIDE.md` (seção "Reasoning Tokens") e valide qual campo é aceito pelo provider instalado (`@openrouter/ai-sdk-provider`) antes de commitar. O guia documenta `reasoning_effort` com valores `high` e `max` na API oficial DeepSeek; para desativar, verifique na documentação vigente do provider qual valor ou ausência do campo corresponde ao modo non-thinking.

---

### 3. Adicionar preferências de roteamento no provider

Ainda dentro de `providerOptions.openrouter`, adicione preferências de roteamento para produção:

```ts
providerOptions: {
  openrouter: {
    session_id: conversationId,
    provider: {
      sort: 'latency',
      allow_fallbacks: true,
    },
  },
},
```

Valide os nomes dos campos contra a versão instalada do provider antes de aplicar.

---

### 4. Adicionar modelo de fallback em `config.ts`

O `DEFAULT_MODEL` atual é `'google/gemma-4-31b-it:free'`. O guia afirma que, em produção, não se deve depender de uma variante gratuita como único caminho.

Exporte uma constante `FALLBACK_MODEL` apontando para `'deepseek/deepseek-v4-flash'` (versão paga) e documente que ela deve ser usada quando o modelo padrão falhar ou quando não houver free tier disponível.

---

### 5. Capturar `cacheReadInputTokens` nos metadados do `onFinish`

O `onFinish` atual salva `inputTokens` e `outputTokens`. Adicione `cacheReadInputTokens` e `cacheWriteInputTokens` quando disponíveis no objeto `usage`, conforme a estrutura retornada pelo Vercel AI SDK.

```ts
metadata: {
  finishReason,
  usage: {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cacheReadInputTokens: usage?.cacheReadInputTokens ?? 0,
    cacheWriteInputTokens: usage?.cacheWriteInputTokens ?? 0,
  },
  latencyMs,
  model: conversation.model,
},
```

---

## Restrições

- Não altere a lógica de negócio, o schema do banco ou as rotas.
- Não mude os system prompts em `api/prompts/`.
- Não adicione dependências novas sem necessidade.
- Valide cada campo de `providerOptions` contra a versão instalada do `@openrouter/ai-sdk-provider` antes de commitar. Se um campo não for suportado, remova-o e registre o motivo em comentário.
- Mantenha todos os testes existentes passando após as mudanças.

---

## Critérios de conclusão

- [ ] `session_id` é passado em toda chamada `streamText` com o `conversationId` correto.
- [ ] Reasoning está desativado no fluxo normal de chat.
- [ ] Preferências de roteamento (`sort: 'latency'`, `allow_fallbacks: true`) estão configuradas.
- [ ] `FALLBACK_MODEL` está exportado em `config.ts`.
- [ ] `cacheReadInputTokens` e `cacheWriteInputTokens` são salvos nos metadados da mensagem.
- [ ] Os testes de integração existentes continuam passando.
