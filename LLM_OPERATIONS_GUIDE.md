# Guia de Operacoes LLM - ia-chat-teacher

> **Versao:** 1.0
> **Data:** 29 de maio de 2026
> **Modelo-alvo:** DeepSeek-V4-Flash via OpenRouter
> **Stack atual:** Vercel AI SDK + `@openrouter/ai-sdk-provider`

---

## Sumario

1. [Introducao](#introducao)
2. [Referencias Tecnicas](#referencias-tecnicas)
3. [Caracteristicas do DeepSeek-V4-Flash](#caracteristicas-do-deepseek-v4-flash)
4. [Context Caching e Prompt Caching](#context-caching-e-prompt-caching)
5. [Otimizacao de Tokens, Custo e Latencia](#otimizacao-de-tokens-custo-e-latencia)
6. [OpenRouter: Uptime, Roteamento e Fallbacks](#openrouter-uptime-roteamento-e-fallbacks)
7. [Reasoning Tokens](#reasoning-tokens)
8. [Metricas Operacionais](#metricas-operacionais)
9. [Testes Automatizados Recomendados](#testes-automatizados-recomendados)
10. [Checklist Operacional](#checklist-operacional)

---

## Introducao

Este documento e a referencia tecnica para desenvolvimento, configuracao e evolucao da
infraestrutura de LLM do ia-chat-teacher.

O leitor deste documento e um desenvolvedor que precisa entender o modelo usado, configurar
chamadas de API, otimizar custo e latencia, e manter o sistema funcionando em producao.

Para diretrizes de criacao e revisao dos prompts pedagogicos, consulte `PROMPT_DESIGN_GUIDE.md`.

---

## Referencias Tecnicas

As informacoes tecnicas neste documento foram verificadas contra:

- OpenRouter: [Latency and Performance](https://openrouter.ai/docs/guides/best-practices/latency-and-performance)
- OpenRouter: [Prompt Caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching)
- OpenRouter: [Uptime Optimization](https://openrouter.ai/docs/guides/best-practices/uptime-optimization)
- OpenRouter: [Reasoning Tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)
- DeepSeek: [DeepSeek-V4 release notes](https://api-docs.deepseek.com/news/news260424)
- Hugging Face: [DeepSeek-V4-Flash model card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash)
- Local PDF: `DeepSeek_V4.pdf`

**Camadas distintas:** este guia separa tres camadas para evitar instrucoes que parecam
garantidas, mas dependam do provedor, do modelo roteado ou da biblioteca usada:

- fatos do paper/model card do DeepSeek-V4;
- comportamento da API oficial DeepSeek;
- parametros aceitos pelo OpenRouter e pelo provider do Vercel AI SDK.

---

## Caracteristicas do DeepSeek-V4-Flash

### O que e seguro afirmar

Segundo o paper/local PDF e o model card, DeepSeek-V4-Flash e um modelo MoE da serie
DeepSeek-V4:

| Caracteristica | Valor ou observacao |
|---|---|
| Arquitetura | Mixture-of-Experts (MoE) |
| Parametros totais | 284B |
| Parametros ativados por token | 13B |
| Contexto | ate 1 milhao de tokens |
| Precisao dos pesos | combinacao FP4/FP8 no release publicado |
| Forca principal | eficiencia em contexto longo com custo menor que modelos densos equivalentes |

Para este produto, a janela de 1M tokens nao deve ser tratada como convite para prompts longos.
Contexto longo e util para historico e documentos futuros, mas system prompts pequenos continuam
melhores para latencia, custo, revisao humana e cache.

### Modos de raciocinio

O paper/model card descreve tres modos de esforco:

| Modo no paper | Uso tipico | Recomendacao para este app |
|---|---|---|
| Non-think | respostas rapidas e rotineiras | padrao para chat de pratica de escrita |
| Think High | analise logica mais lenta | evitar no fluxo normal; usar apenas em recurso explicito de explicacao |
| Think Max | raciocinio maximo, com instrucao especial | nao usar no system prompt base |

A API oficial DeepSeek tambem documenta controles de thinking/non-thinking e `reasoning_effort`
para `high` ou `max`. Para um chat pedagogico, reasoning aumenta tokens de saida, tempo ate a
resposta e risco de respostas analiticas demais.

**Regra para o projeto:** configurar o modelo para funcionamento em modo non-thinking. Se uma
feature futura precisar de analise gramatical detalhada, ative reasoning na chamada daquela
feature, nao no system prompt global. Quando a API/provedor expuser um toggle de thinking e o
padrao for thinking habilitado, desabilite-o em runtime para o chat comum em vez de tentar
resolver isso por texto no prompt.

### Compatibilidade de API

O produto atual usa OpenRouter via Vercel AI SDK. Portanto:

- trate OpenRouter como a camada operacional principal;
- use IDs de modelo definidos em `api/src/lib/ai/config.ts`;
- nao copie exemplos de SDKs diferentes sem adaptar para `streamText`;
- parametros especificos do OpenRouter devem ser enviados por `providerOptions.openrouter`
  ou por `extraBody` no model/provider, conforme suportado pelo provider instalado.

---

## Context Caching e Prompt Caching

### DeepSeek Context Caching

DeepSeek documenta context caching automatico. A ideia central e reutilizar prefixos de contexto
ja processados. Isso beneficia system prompts e historicos repetidos, mas nao deve ser tratado
como garantia absoluta de cache hit.

Regras praticas:

- prefixos identicos sao mais provaveis de serem reutilizados;
- qualquer mudanca antes do trecho estavel reduz a chance de cache;
- cache pode ter tempo de construcao e expiracao;
- cache e otimizacao de custo/latencia, nao contrato funcional.

### OpenRouter Prompt Caching

OpenRouter descreve caching automatico para alguns provedores/modelos e sticky routing para
melhorar cache hits. Para DeepSeek, o cache write e documentado como cobranca normal de input;
cache read usa um multiplicador/preco especifico do provider/modelo. Consulte a pagina de
pricing vigente antes de estimar economia exata.

Recomendacao para o produto:

- deixar o system prompt estavel e repetido;
- passar historico em ordem cronologica;
- manter `system` antes das mensagens dinamicas;
- usar `session_id` por conversa quando estiver usando OpenRouter;
- registrar uso e custo quando a API devolver metadata suficiente.

### Exemplo com Vercel AI SDK

O projeto usa `streamText`, portanto o exemplo correto deve seguir o provider instalado:

```ts
const result = streamText({
  model,
  system: systemPrompt,
  messages: modelMessages,
  providerOptions: {
    openrouter: {
      session_id: conversationId,
    },
  },
})
```

Se um parametro OpenRouter nao for aceito pelo provider ou pelo modelo, remova-o e prefira a
configuracao mais simples. Nao dependa de um exemplo REST se o codigo real usa Vercel AI SDK.

---

## Otimizacao de Tokens, Custo e Latencia

### Medicao pratica de tokens

Use uma contagem aproximada antes de aprovar prompts finais:

```bash
python -c "from pathlib import Path; print(len(Path('api/prompts/A1.md').read_text().split()))"
```

Para estimativa de tokens mais realista, use o tokenizer disponivel no stack escolhido. A contagem
exata pode variar por modelo/provedor.

### Principios de custo

- System prompts menores reduzem custo de input por requisicao.
- Cache reads sao mais baratos que cache writes; manter o prefixo estavel maximiza hits.
- Output tokens costam mais que input tokens; limite o `max_tokens` da resposta quando possivel.
- Reasoning tokens adicionam custo proporcional ao raciocinio gerado; desative no fluxo normal.

### Latencia

- Prefira Non-Think mode para chat de pratica de escrita.
- Sticky routing do OpenRouter melhora cache hits e pode reduzir latencia.
- Monitore tempo ate primeiro token (TTFT) separadamente da latencia total.
- Streaming reduz a latencia percebida pelo usuario.

---

## OpenRouter: Uptime, Roteamento e Fallbacks

OpenRouter pode rotear uma mesma solicitacao entre provedores e permite ajustes de fallback,
ordenacao e parametros de provider. Isso deve ser configurado no codigo de chamada, nao no
system prompt.

### Recomendacoes

1. **Defina um modelo primario e fallbacks.**
   Para producao, nao dependa de uma variante gratuita como unico caminho.

2. **Use `models` quando aceitar fallback entre modelos.**
   Um fallback deve preservar comportamento pedagogico. Evite cair em modelos muito diferentes
   sem testar os prompts.

3. **Use `provider` para preferencias operacionais.**
   Ordenacao por latencia, throughput ou preco pode ser util, mas deve ser validada com logs.

4. **Use `require_parameters` quando depender de parametros especificos.**
   Se a chamada exige `response_format`, tools ou reasoning, nao deixe OpenRouter rotear para
   provedor que ignora esses parametros.

5. **Monitore quedas e degradacao.**
   Salve modelo usado, latencia, finish reason, tokens e erros de API.

### Exemplo conceitual

```ts
const result = streamText({
  model,
  system: systemPrompt,
  messages: modelMessages,
  providerOptions: {
    openrouter: {
      session_id: conversationId,
      provider: {
        sort: 'latency',
        allow_fallbacks: true,
      },
    },
  },
})
```

Valide os campos aceitos contra a versao instalada do provider antes de commitar.

---

## Reasoning Tokens

Reasoning tokens sao tokens gastos pelo modelo antes da resposta final. Eles podem melhorar
problemas de matematica, planejamento e analise complexa, mas sao desperdicio para a maioria
dos turnos de pratica de escrita.

### Politica para este app

| Caso | Reasoning |
|---|---|
| Conversa normal | desativado ou nao solicitado |
| Correcao curta | desativado |
| Usuario pede "explain this grammar rule" | opcional, baixo/medio |
| Analise de texto longo C1-C2 | opcional, com limite |
| Chat A1-A2 | evitar |

### Diretrizes

- Nao coloque "think deeply", "show your reasoning" ou "reason step by step" no system prompt base.
- Nao use Think Max para conversa normal.
- Se usar reasoning em recurso especifico, limite tokens e monitore latencia.
- Nunca exponha reasoning interno ao usuario.
- Prefira respostas finais claras, curtas e pedagogicas.

### Observacao sobre DeepSeek e OpenRouter

Na API oficial DeepSeek, thinking/non-thinking e `reasoning_effort` sao controles de chamada.
No OpenRouter, a disponibilidade e o formato de parametros de reasoning variam por modelo e
provedor. Portanto, trate reasoning como configuracao de runtime validada por teste, nao como
instrucao textual no prompt.

---

## Metricas Operacionais

Monitore estas metricas em producao para garantir qualidade e controlar custo:

- tempo ate primeiro token (TTFT);
- latencia total por requisicao;
- input tokens e output tokens por requisicao;
- cache reads e cache writes quando disponiveis na metadata;
- custo por conversa;
- taxa de erro por modelo/provedor;
- taxa de fallback;
- finish reasons anormais.

Use logs estruturados para capturar modelo usado, latencia, tokens e erros de API em cada chamada.

---

## Testes Automatizados Recomendados

- golden conversations por nivel com avaliador LLM offline para CEFR match e over-correction;
- snapshots de formato de resposta;
- teste de tamanho maximo de prompt;
- teste que garante estrutura comum entre `A1.md` a `C2.md`;
- logging de uso para validar custo e latencia em ambiente real.

---

## Checklist Operacional

Use este checklist para validar aspectos tecnicos antes de publicar um prompt em producao:

- [ ] Prompt dentro do orcamento de tokens definido em `PROMPT_DESIGN_GUIDE.md`?
- [ ] System prompt estavel o suficiente para maximizar cache hits?
- [ ] Funciona com `streamText` e OpenRouter?
- [ ] Reasoning desativado no fluxo normal de chat?
- [ ] O modelo configurado em `api/src/lib/ai/config.ts` corresponde ao modelo-alvo de producao?
- [ ] Logs capturam modelo, tokens, latencia e erros?
- [ ] Fallbacks configurados para producao?
- [ ] Metricas de custo monitoradas?
- [ ] `session_id` passado por conversa para melhorar sticky routing?
