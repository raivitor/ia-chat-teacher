# Tarefa 5 — Plano de implementação das melhorias LLM e operacionais

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

1. Fase 4: prompts A1-C2.
2. Fase 5: avaliação pedagógica.
3. Fase 6: melhorias de UX/métricas.
4. Fase 7: documentação final.

---

## Fora do escopo inicial

- Trocar o banco ou alterar schema para métricas agregadas antes de validar necessidade.
- Adicionar fila, worker ou tracing distribuído completo.
- Criar dashboard administrativo completo antes de existir dado confiável.
- Rodar testes automatizados contra OpenRouter em todo CI.
- Usar reasoning em conversa normal.
- Expor chain-of-thought ou reasoning interno ao usuário.

---

## Definition of Done da Tarefa 5

- [ ] Prompts A1-C2 estão preenchidos e cobertos por testes de estrutura/orçamento.
- [ ] Há fixtures iniciais de avaliação pedagógica por nível.
- [ ] O indicador de contexto do web usa dados coerentes.
- [ ] README e documentação operacional refletem o comportamento real do projeto.
