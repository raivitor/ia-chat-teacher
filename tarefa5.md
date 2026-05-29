# Tarefa 4 — Plano de implementação das melhorias LLM e operacionais

## Objetivo

Criar uma implementação incremental para alinhar o projeto **ia-chat-teacher** ao
`LLM_OPERATIONS_GUIDE.md`, cobrindo as lacunas atuais de confiabilidade, custo, observabilidade,
fallbacks, testes e qualidade pedagógica.

O projeto atual já tem a base funcional: Next.js no `web/`, Express/TypeScript no `api/`,
persistência com Drizzle/Postgres, `streamText` do Vercel AI SDK e OpenRouter via
`@openrouter/ai-sdk-provider`.

Esta tarefa não deve repetir mudanças já aplicadas. Ela deve transformar o guia operacional em
um backlog técnico claro, priorizado e verificável.

---

## Estado atual identificado

### Já existe no código

- `api/src/services/chatService.ts` usa `streamText`.
- `providerOptions.openrouter.session_id` já é passado com `conversationId`.
- `provider.sort = 'latency'` e `allow_fallbacks = true` já estão configurados.
- Reasoning já é sinalizado como `reasoning: { effort: 'none' }`.
- `api/src/lib/ai/config.ts` já exporta `FALLBACK_MODEL = 'deepseek/deepseek-v4-flash'`.
- Metadados da resposta já salvam `inputTokens`, `outputTokens`, `cacheReadTokens`,
  `cacheWriteTokens`, `latencyMs`, `finishReason` e `model`.
- O frontend já exibe um indicador simples de uso de contexto.

### Lacunas importantes

- O modelo-alvo do guia é DeepSeek-V4-Flash, mas o `DEFAULT_MODEL` ainda é uma opção gratuita da
  Gemma. Falta estratégia explícita de modelo por ambiente.
- `FALLBACK_MODEL` existe, mas não há fallback entre modelos configurado na chamada do OpenRouter.
- O código de `providerOptions` está inline no `chatService.ts`, sem teste unitário direto.
- Não há medição de TTFT (tempo até primeiro token).
- Não há logging estruturado para modelo usado, tokens, latência, erros, fallback e finish reasons.
- Não há custo por conversa nem `usage.include` do OpenRouter para metadados detalhados quando
  disponíveis.
- Os prompts `api/prompts/A1.md` a `C2.md` existem, mas estão vazios.
- Não há testes de prompt budget, estrutura comum dos prompts, snapshots de resposta ou golden
  conversations.
- O indicador de contexto no web usa apenas o último `usage` salvo, não o consumo acumulado da
  conversa.
- O `README.md` está desatualizado nos exemplos de modelo e não documenta a estratégia operacional
  do OpenRouter.

---

## Plano de implementação

### Fase 1 — Consolidar configuração LLM

**Objetivo:** remover configuração espalhada e tornar comportamento de produção explícito.

Arquivos principais:

- `api/src/lib/ai/config.ts`
- `api/src/lib/ai/client.ts`
- `api/src/services/chatService.ts`
- novo arquivo sugerido: `api/src/lib/ai/openrouterOptions.ts`

Implementação:

1. Criar uma função pura para montar as opções do OpenRouter:

   ```ts
   buildOpenRouterProviderOptions({
     conversationId,
     primaryModel,
     fallbackModel,
     includeUsage,
   })
   ```

2. Centralizar nela:

   - `session_id: conversationId`;
   - `provider.sort = 'latency'`;
   - `provider.allow_fallbacks = true`;
   - `reasoning.effort = 'none'`;
   - `usage.include = true`, se validado contra a versão instalada do provider;
   - `models: [primaryModel, fallbackModel]`, removendo duplicatas, se a chamada real suportar
     fallback entre modelos via `providerOptions.openrouter.models`.

3. Separar modelo padrão de desenvolvimento e produção:

   - manter um modelo gratuito apenas para desenvolvimento local, se desejado;
   - usar DeepSeek-V4-Flash pago como recomendação de produção;
   - permitir override por variável de ambiente, por exemplo `OPENROUTER_DEFAULT_MODEL`;
   - documentar que free tier não é caminho único de produção.

4. Expor no endpoint `/api/models` informações úteis para o web:

   - `defaultModel`;
   - `fallbackModel`;
   - `productionRecommendedModel`;
   - `contextWindow`.

Critérios de aceite:

- [ ] `chatService.ts` não monta `providerOptions` inline.
- [ ] `FALLBACK_MODEL` é usado de fato na estratégia de fallback ou há justificativa documentada.
- [ ] O modelo padrão de produção está alinhado ao `LLM_OPERATIONS_GUIDE.md`.
- [ ] A configuração compila com `@openrouter/ai-sdk-provider@2.9.x`.

---

### Fase 2 — Observabilidade, custo e metadados

**Objetivo:** medir o que o guia exige antes de otimizar.

Arquivos principais:

- `api/src/services/chatService.ts`
- `api/src/types/message.ts`
- novo arquivo sugerido: `api/src/lib/observability/logger.ts`

Implementação:

1. Capturar TTFT usando o primeiro chunk/token do stream, validando o callback correto do AI SDK
   instalado.

2. Expandir metadados salvos da mensagem:

   - `totalTokens`;
   - `cacheReadTokens`;
   - `cacheWriteTokens`;
   - `reasoningTokens`;
   - `ttftMs`;
   - `latencyMs`;
   - `finishReason`;
   - `requestedModel`;
   - `fallbackModel`;
   - `providerMetadata` ou `rawUsage`, quando disponível e seguro.

3. Adicionar logging estruturado no backend. Começar com um wrapper simples sobre `console` ou
   adotar `pino` se o projeto aceitar uma dependência dedicada.

4. Registrar em cada chamada:

   - `conversationId`;
   - `level`;
   - `requestedModel`;
   - `latencyMs`;
   - `ttftMs`;
   - tokens de input/output/cache/reasoning;
   - erro de API, quando houver;
   - finish reason anormal.

5. Manter persistência em `metadata` nesta fase. Criar tabelas de métricas só se houver necessidade
   real de consultas agregadas.

Critérios de aceite:

- [ ] TTFT e latência total aparecem nos metadados ou logs.
- [ ] Uso de cache e reasoning tokens é registrado com os nomes reais do AI SDK
      (`inputTokenDetails.cacheReadTokens`, `inputTokenDetails.cacheWriteTokens`,
      `outputTokenDetails.reasoningTokens`).
- [ ] Erros de OpenRouter são logados com contexto suficiente, sem vazar API key ou conteúdo sensível
      desnecessário.
- [ ] O código continua sem alteração de schema obrigatória.

---

### Fase 3 — Testes técnicos do runtime LLM

**Objetivo:** impedir regressões na camada mais cara e instável do produto.

Arquivos principais:

- `api/src/lib/ai/*.unit.spec.ts`
- `api/src/services/chatService.ts`
- `api/src/services/chatService*.spec.ts`

Implementação:

1. Testar a função pura de opções do OpenRouter:

   - passa `session_id`;
   - configura roteamento por latência;
   - permite fallbacks;
   - desativa reasoning no fluxo normal;
   - inclui usage accounting quando habilitado;
   - deduplica lista de modelos.

2. Extrair uma função testável para mapear `usage` do AI SDK para `metadata.usage`.

3. Testar mapeamento de:

   - input/output tokens;
   - cache read/write tokens;
   - reasoning tokens;
   - campos ausentes.

4. Adicionar teste de integração ou unidade com mock do `streamText` para garantir que
   `conversationId` e histórico correto chegam à chamada.

5. Evitar chamadas reais ao OpenRouter nos testes automatizados padrão.

Critérios de aceite:

- [ ] Existe cobertura direta para `providerOptions`.
- [ ] Existe cobertura direta para metadados de uso.
- [ ] Testes não dependem de API externa.
- [ ] `npm run validate --prefix api` passa.

---

### Fase 4 — System prompts por nível CEFR

**Objetivo:** fazer o produto realmente se comportar como tutor de escrita por nível.

Arquivos principais:

- `api/prompts/A1.md`
- `api/prompts/A2.md`
- `api/prompts/B1.md`
- `api/prompts/B2.md`
- `api/prompts/C1.md`
- `api/prompts/C2.md`
- `PROMPT_DESIGN_GUIDE.md`

Implementação:

1. Criar prompts finais seguindo a estrutura do `PROMPT_DESIGN_GUIDE.md`:

   - identidade curta;
   - regras globais consistentes;
   - processo interno sem expor raciocínio;
   - regras específicas do nível;
   - formato de resposta;
   - 2 a 3 exemplos few-shot por nível.

2. Manter o prefixo global o mais estável possível entre A1-C2 para favorecer cache.

3. Definir orçamento de palavras/tokens por nível.

4. Criar testes automatizados simples:

   - todo arquivo de nível não está vazio;
   - todos os prompts contêm seções obrigatórias;
   - nenhum prompt contém instruções como "show your reasoning" ou "think step by step";
   - tamanho máximo por prompt respeita o orçamento definido.

Critérios de aceite:

- [ ] Os seis prompts estão preenchidos.
- [ ] A estrutura dos prompts é consistente entre níveis.
- [ ] Prompts não ativam reasoning explícito nem chain-of-thought exposto.
- [ ] Testes de estrutura e orçamento passam.

---

### Fase 5 — Avaliação pedagógica e golden conversations

**Objetivo:** medir qualidade de resposta, não apenas funcionamento técnico.

Arquivos sugeridos:

- `api/src/test/fixtures/golden-conversations/*.json`
- `api/src/lib/evaluation/*.ts`
- `docs/evaluation.md` ou seção equivalente no README

Implementação:

1. Criar conversas de referência por nível A1-C2:

   - erros típicos do nível;
   - mensagens curtas e longas;
   - pedido de explicação em português;
   - tentativa de prompt injection;
   - casos em que o tutor deve corrigir pouco.

2. Validar respostas com critérios objetivos:

   - idioma principal é inglês;
   - tamanho esperado por nível;
   - número máximo de correções;
   - pergunta final que incentiva escrita;
   - ausência de raciocínio interno;
   - adequação CEFR aproximada.

3. Começar com snapshots manuais e evoluir para avaliador LLM offline somente quando houver
   estabilidade nos prompts.

Critérios de aceite:

- [ ] Há fixtures de avaliação para A1-C2.
- [ ] Há checklist de qualidade pedagógica versionado.
- [ ] O fluxo de avaliação não roda contra OpenRouter por padrão no CI.

---

### Fase 6 — UX de uso de contexto e métricas

**Objetivo:** tornar custo/contexto compreensível para o usuário ou operador.

Arquivos principais:

- `web/src/components/chat/ChatInterface.tsx`
- `web/src/lib/api.ts`
- possivelmente `api/src/services/conversationService.ts`

Implementação:

1. Corrigir o cálculo de contexto para não usar apenas a última resposta.

2. Mostrar consumo acumulado da conversa quando os metadados estiverem disponíveis.

3. Adicionar estados discretos de aviso:

   - abaixo de 70%;
   - entre 70% e 90%;
   - acima de 90%.

4. Em uma fase futura, criar visão interna/admin para:

   - latência média;
   - TTFT;
   - cache hit aproximado;
   - taxa de erro;
   - taxa de fallback;
   - custo estimado.

Critérios de aceite:

- [ ] O indicador de contexto usa dados acumulados ou documenta claramente sua limitação.
- [ ] O web continua funcionando quando mensagens antigas não têm metadata de usage.
- [ ] Não há quebra de compatibilidade com conversas já persistidas.

---

### Fase 7 — Documentação operacional

**Objetivo:** deixar o projeto fácil de operar depois das mudanças.

Arquivos principais:

- `README.md`
- `api/README.md`
- `LLM_OPERATIONS_GUIDE.md`, se precisar de pequenos ajustes

Implementação:

1. Atualizar exemplos de modelo no README.

2. Documentar variáveis de ambiente:

   - `OPENROUTER_API_KEY`;
   - `OPENROUTER_DEFAULT_MODEL`;
   - `OPENROUTER_FALLBACK_MODEL`, se implementado;
   - flags de ambiente para usage accounting ou logging detalhado, se existirem.

3. Documentar diferença entre desenvolvimento local com modelo gratuito e produção com modelo pago.

4. Documentar comandos de validação:

   ```bash
   npm run validate --prefix api
   npm run validate --prefix web
   ```

Critérios de aceite:

- [ ] README não aponta para modelos antigos ou inconsistentes.
- [ ] Estratégia de modelo/fallback está clara para desenvolvimento e produção.
- [ ] Novos testes e validações estão documentados.

---

## Ordem recomendada

1. Fase 1: configuração LLM centralizada e fallback real.
2. Fase 3: testes técnicos da configuração e metadados.
3. Fase 2: TTFT, logs e usage detalhado.
4. Fase 4: prompts A1-C2.
5. Fase 5: avaliação pedagógica.
6. Fase 6: melhorias de UX/métricas.
7. Fase 7: documentação final.

Motivo da ordem: primeiro estabilizar a chamada LLM e cobrir com testes; depois medir; em seguida
melhorar comportamento pedagógico e experiência.

---

## Fora do escopo inicial

- Trocar o banco ou alterar schema para métricas agregadas antes de validar necessidade.
- Adicionar fila, worker ou tracing distribuído completo.
- Criar dashboard administrativo completo antes de existir dado confiável.
- Rodar testes automatizados contra OpenRouter em todo CI.
- Usar reasoning em conversa normal.
- Expor chain-of-thought ou reasoning interno ao usuário.

---

## Definition of Done da Tarefa 4

- [ ] Existe fallback real entre modelo primário e modelo pago recomendado.
- [ ] Configuração OpenRouter fica centralizada, tipada e testada.
- [ ] TTFT, latência, tokens, cache e reasoning são mensurados.
- [ ] Logs estruturados registram sucesso, erro e finish reasons anormais.
- [ ] Prompts A1-C2 estão preenchidos e cobertos por testes de estrutura/orçamento.
- [ ] Há fixtures iniciais de avaliação pedagógica por nível.
- [ ] O indicador de contexto do web usa dados coerentes.
- [ ] README e documentação operacional refletem o comportamento real do projeto.
