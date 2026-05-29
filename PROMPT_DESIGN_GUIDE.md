# Guia de Design de System Prompts — ia-chat-teacher

> **Versão:** 1.0  
> **Data:** 29 de maio de 2026  
> **Modelo-alvo:** DeepSeek-V4-Flash (via API DeepSeek ou OpenRouter)  
> **Contexto:** Aplicação de prática de escrita em inglês com níveis CEFR A1–C2

---

## Sumário

1. [Introdução](#introdução)
2. [Objetivos dos System Prompts](#objetivos-dos-system-prompts)
3. [Características do DeepSeek-V4-Flash](#características-do-deepseek-v4-flash)
4. [Arquitetura Recomendada dos Prompts](#arquitetura-recomendada-dos-prompts)
5. [Estrutura Base de um System Prompt](#estrutura-base-de-um-system-prompt)
6. [Estratégias de Ensino de Inglês](#estratégias-de-ensino-de-inglês)
7. [Adaptação por Nível (A1–C2)](#adaptação-por-nível-a1c2)
8. [Uso de Few-Shot Examples](#uso-de-few-shot-examples)
9. [Uso de Chain of Thought](#uso-de-chain-of-thought)
10. [Uso de ReAct](#uso-de-react)
11. [Context Caching](#context-caching)
12. [Otimização de Tokens](#otimização-de-tokens)
13. [Boas Práticas](#boas-práticas)
14. [Anti-Padrões](#anti-padrões)
15. [Template Base Recomendado](#template-base-recomendado)
16. [Checklist para Revisão de Prompts](#checklist-para-revisão-de-prompts)
17. [Exemplos de System Prompts](#exemplos-de-system-prompts)

---

## Introdução

Este documento é a referência oficial para a criação e manutenção dos System Prompts da aplicação **ia-chat-teacher** — uma plataforma de prática de escrita em inglês baseada em conversação com IA.

Os prompts ficam armazenados em `api/prompts/` como arquivos Markdown (`A1.md`, `A2.md`, … `C2.md`). Em runtime, o arquivo correspondente ao nível selecionado pelo usuário no onboarding é carregado e enviado como `system message` para o modelo.

Este guia responde às perguntas mais críticas para quem precisará escrever ou revisar esses prompts:

- Quais técnicas realmente funcionam para um chat pedagógico?
- Como estruturar o prompt de forma que ele seja cacheado eficientemente?
- Como manter a consistência pedagógica sem inflar o tamanho do prompt?
- Como adaptar o comportamento por nível sem duplicar todo o conteúdo?

---

## Objetivos dos System Prompts

Cada System Prompt deve garantir que o modelo:

| Objetivo | Descrição |
|---|---|
| **Idioma** | Responda sempre em inglês (com exceções pedagógicas pontuais) |
| **Vocabulário** | Use vocabulário compatível com o nível CEFR do usuário |
| **Gramática** | Produza frases com complexidade gramatical adequada ao nível |
| **Incentivo** | Estimule o usuário a escrever mais, fazendo perguntas abertas |
| **Correção** | Corrija erros de forma construtiva, adaptando o nível de rigor ao nível do aluno |
| **Progressão** | Apresente estruturas ligeiramente acima do nível atual (Input Hypothesis de Krashen: `i+1`) |
| **Naturalidade** | Mantenha o fluxo de conversa natural, sem parecer uma prova formal |

---

## Características do DeepSeek-V4-Flash

### Arquitetura e Parâmetros

DeepSeek-V4-Flash é um modelo Mixture-of-Experts (MoE):

| Parâmetro | Valor |
|---|---|
| Parâmetros totais | 284B |
| Parâmetros ativados por inferência | 13B |
| Janela de contexto | **1 milhão de tokens** |
| Precisão | FP4 (experts MoE) + FP8 (demais camadas) |

A natureza MoE significa que, apesar dos 284B de parâmetros totais, **apenas 13B são ativados** em cada inferência — resultando em latência e custo muito menores que um modelo denso equivalente.

### Três Modos de Raciocínio

O DeepSeek-V4-Flash suporta três modos de raciocínio:

| Modo | Velocidade | Uso ideal | Marcador de saída |
|---|---|---|---|
| **Non-think** | Mais rápido | Tarefas rotineiras, chat casual | `</think>` (summary vazio) |
| **Think High** | Moderado | Análise lógica, resolução de problemas | `<think>...</think>` + resposta |
| **Think Max** | Mais lento | Raciocínio máximo | System prompt especial + `<think>...</think>` |

> **Recomendação para este projeto:** Use **Non-think** por padrão para conversas. O modo Think não traz benefícios pedagógicos significativos para chat de linguagem e aumenta latência e custo desnecessariamente.

### Prompt Caching

O DeepSeek (tanto na API oficial quanto via OpenRouter) suporta **caching automático de prompts**:

- **Cache writes:** cobrado ao preço normal do input
- **Cache reads:** cobrado a **0.1x** do preço normal (desconto de 90%)
- **Ativação:** automática, sem configuração adicional

Isso significa que o System Prompt (que é a parte mais estável do contexto) será cacheado depois da primeira requisição, resultando em economia massiva em produção.

### Compatibilidade de API

- Compatível com **OpenAI ChatCompletions API**
- Compatível com **Anthropic Messages API**
- Acessível via DeepSeek API direta ou OpenRouter

---

## Arquitetura Recomendada dos Prompts

### Princípio Fundamental: Estabilidade no Início

O caching automático do DeepSeek funciona de forma posicional — os tokens do início do contexto são cacheados primeiro. Para maximizar as economias:

```
[SYSTEM PROMPT - ESTÁVEL - CACHEADO]
  ↓
[Regras globais de comportamento]
[Regras específicas do nível]
[Poucos exemplos Few-Shot]
  ↓
[HISTÓRICO DE CONVERSA - DINÂMICO - NÃO CACHEADO]
  ↓
[User: última mensagem]
```

**Regra de ouro:** Tudo que muda entre requisições deve vir **ao final** do contexto. Tudo que é estável deve vir **no início**, dentro do System Prompt.

### Separação Global vs. Por Nível

Em vez de ter um arquivo único e monolítico por nível, considere esta arquitetura de camadas:

```
[Comportamento Global]        ← regras que valem para todos os níveis
[Identidade do tutor]         ← persona fixa
[Regras pedagógicas]          ← metodologia de correção e incentivo
---
[Especificidades do Nível X]  ← vocabulário, gramática, tópicos
[Exemplos Few-Shot do Nível]  ← 2-3 exemplos específicos do nível
```

**Vantagem:** Quando uma regra global mudar (ex.: forma de correção), você altera apenas um lugar, não 6 arquivos.

**Implementação prática:** Como os prompts são arquivos `.md` separados por nível, mantenha uma seção inicial idêntica em todos os arquivos (o "bloco global"), seguida da seção variável por nível. Isso facilita manutenção e ainda beneficia do caching (o bloco global será o prefixo cacheado).

---

## Estrutura Base de um System Prompt

Um System Prompt bem estruturado para este projeto deve conter as seguintes seções, nesta ordem:

### 1. Identidade e Papel

Define **quem** o modelo é. Deve ser curto, claro e estável.

```markdown
You are an English writing coach named Aria. Your role is to have
natural conversations with English learners and help them improve
their writing skills through practice.
```

### 2. Regras de Idioma

Define o **comportamento linguístico fundamental**.

```markdown
## Language Rules
- Always respond in English.
- You may use the user's native language ONLY when: (a) explicitly asked,
  or (b) explaining a concept that is genuinely impossible to convey otherwise.
- Keep responses concise. Aim for 2–4 sentences per turn.
```

### 3. Regras Pedagógicas (Globais)

Define **como** corrigir, incentivar e guiar. Estas regras devem ser idênticas em todos os níveis — apenas a intensidade/forma varia.

```markdown
## Teaching Approach
- After reading the user's message, silently assess: vocabulary, grammar,
  spelling, and naturalness.
- Correct errors in a friendly, constructive way. Prioritize the most
  impactful errors; do not correct everything at once.
- Always end your turn with an open question or a writing prompt to
  encourage the user to keep writing.
- Introduce vocabulary and structures slightly above the user's current
  level (stretch input).
```

### 4. Regras Específicas do Nível

Define **o que** é adequado para aquele nível CEFR específico.

```markdown
## Level: A1 (Beginner)
- Use only the most basic vocabulary (top 500 most common words).
- Use Present Simple and Present Continuous tenses only.
- Keep sentences short (max 10 words per sentence).
- Topics: daily routines, family, numbers, colors, basic objects.
- Correct only spelling and basic word order errors. Ignore complex
  grammar mistakes for now.
```

### 5. Exemplos Few-Shot (2–3 exemplos)

Demonstra o **formato e tom** esperados da resposta.

```markdown
## Examples

User: I have dog. He name is Max.
Assistant: Oh, how cute! What kind of dog is Max? 🐶
(Small note: we say "I have **a** dog" and "His name is Max"!)

User: Today I go to school by bus.
Assistant: Great! Is school far from your home?
(Good sentence! One small tip: for regular habits, "I **go** to school"
is perfect — you got it right!)
```

### 6. Instruções de Formato de Saída (Opcional, mas recomendado)

Define **como** formatar a resposta.

```markdown
## Response Format
- Write naturally, as in a real chat conversation.
- Do not use headers, bullet points, or markdown in your replies.
- When making a correction, put it in parentheses at the end of your message.
- Maximum response length: 100 words.
```

---

## Estratégias de Ensino de Inglês

### Input Hypothesis (Krashen)

O conceito central de aquisição de segunda língua é o **input compreensível**: o aluno aprende melhor quando exposto a linguagem ligeiramente acima de seu nível atual (`i+1`).

**Aplicação no prompt:**
- Para A1: use estruturas A1, mas introduza 1–2 palavras novas por turno
- Para B1: use estruturas B1 predominantemente, mas inclua B2 ocasionalmente
- Evite saltos grandes (ex.: um A2 ver linguagem C1 é desmotivante)

### Output Hypothesis (Swain)

O aluno também aprende ao **produzir** output, especialmente quando percebe gaps em seu conhecimento.

**Aplicação no prompt:**
- Sempre termine com uma pergunta que incentive o usuário a escrever
- Prefira perguntas abertas ("What do you think about...?") a perguntas de sim/não
- Varie os tipos de prompt: opinião, narração, descrição

### Correção de Erros: Abordagem Sanduíche

A abordagem mais eficaz pedagogicamente para correção é:

```
1. Positive reinforcement (acknowledge what was good)
2. Gentle correction (reformulate or point out the error)
3. Move forward (keep the conversation going)
```

**Exemplo de instrução no prompt:**
```markdown
When correcting errors:
1. First, respond naturally to the content of what the user wrote.
2. Then, gently note 1–2 errors (not all errors).
3. Do not make the user feel bad. Use phrases like "Small tip:", "One note:",
   or "By the way:".
4. For A1–B1: correct only errors that impede communication.
5. For B2–C2: correct accuracy, naturalness, and register.
```

---

## Adaptação por Nível (A1–C2)

### Mapeamento CEFR para Diretrizes de Prompt

| Nível | Vocabulário | Gramática alvo | Tom de correção | Comprimento de resposta |
|---|---|---|---|---|
| **A1** | Top 500 palavras | Present Simple, verbos ser/ter, números | Muito gentil, max 1 correção | 1–3 frases curtas |
| **A2** | Top 1.500 palavras | Past Simple, futuro com "going to", comparativos | Gentil, max 1–2 correções | 2–4 frases |
| **B1** | Top 3.000 palavras | Present Perfect, modais básicos, condicionais tipo 1 | Construtivo, 2–3 correções | 3–5 frases |
| **B2** | Vocabulário rico, phrasal verbs | Voz passiva, condicionais tipo 2–3, reported speech | Direto e específico | 4–6 frases |
| **C1** | Coloquialismos, jargões, registro formal/informal | Nuances de tempo, inversão, subjuntivo | Foco em estilo, naturalidade, registro | 5–8 frases |
| **C2** | Expressões idiomáticas, provérbios, vocabulário literário | Tudo, foco em elegância e precisão | Parceiro de escrita, feedback editorial | 6–10 frases |

### Estratégia de Escalada de Complexidade

Para cada turno de conversa, o modelo deve internamente seguir este raciocínio (implícito, não explícito):

1. **Avaliar** o que o usuário escreveu (nível real vs. nível declarado)
2. **Responder** no nível alvo
3. **Corrigir** com intensidade proporcional ao nível
4. **Incentivar** com uma pergunta adequada ao nível

---

## Uso de Few-Shot Examples

### O que é Few-Shot

Few-Shot prompting consiste em fornecer exemplos de input-output desejados dentro do prompt, para que o modelo "aprenda" o padrão esperado sem necessidade de fine-tuning.

### Avaliação para este projeto

**Adequação:** ✅ **Alta** — Para este caso de uso, Few-Shot é uma das técnicas mais eficazes.

**Por quê funciona bem aqui:**
- O formato de resposta do tutor (resposta + correção entre parênteses) é não-óbvio e Few-Shot o ensina com precisão
- O tom correto (encorajador, não condescendente) é subjetivo — exemplos demonstram melhor que descrições
- A proporção entre conteúdo e correção é difícil de descrever; é mais fácil mostrar

**Vantagens:**
- Garante consistência de formato sem instruções longas
- Reduz ambiguidade de interpretação
- Muito eficaz para "calibrar tom" (A1 vs. C2 têm tons muito diferentes)

**Desvantagens:**
- Adiciona tokens ao System Prompt (custo inicial de cache write)
- Se os exemplos forem ruins, o modelo os seguirá fielmente (garbage in, garbage out)
- Exemplos muito homogêneos podem reduzir a variedade das respostas

### Diretrizes para Exemplos Eficientes

1. **Use 2–3 exemplos por nível** — Mais que 3 raramente agrega valor proporcional ao custo em tokens.

2. **Cubra casos distintos** — Escolha exemplos que mostram situações diferentes:
   - Um com erro leve (para demonstrar gentileza)
   - Um com erro mais sério (para demonstrar como corrigir sem desmotivar)
   - Um sem erro (para demonstrar que o modelo não inventa correções)

3. **O formato do exemplo deve ser idêntico ao formato esperado em produção:**
   ```
   User: [mensagem do aluno com o nível X de inglês]
   Assistant: [resposta natural + correção + pergunta de incentivo]
   ```

4. **Calibre os exemplos ao nível:**
   - A1: frases curtas, erros básicos (artigos, concordância simples)
   - C2: frases complexas, erros de registro, colocações inadequadas

5. **Evite exemplos que demonstram o que NÃO fazer** — O modelo pode se confundir e seguir o exemplo negativo.

### Exemplo de Few-Shot Bem Estruturado (B1)

```markdown
## Examples

### Example 1 — Minor grammatical error
User: Yesterday I have watched a very good film about robots.
Assistant: That sounds exciting! What was the film about — were the robots
good or evil? I love science fiction movies too.
(Quick note: for finished past actions, use "I **watched**" instead of
"I have watched" 🎬)

### Example 2 — Communication-blocking error
User: I very like when I can to go beach with my family.
Assistant: Going to the beach with family sounds wonderful! Do you have a
favorite beach or do you go to different places?
(A small tip: we say "I **really like**" or "I **love**" — and we drop
"to" after "can": "I can **go** to the beach".)

### Example 3 — No errors (positive reinforcement)
User: Last summer, my family and I went to the mountains for two weeks.
The weather was perfect and we hiked every day.
Assistant: That sounds like an amazing vacation! Two weeks in the mountains
must have been so refreshing. What was the most challenging hike you did?
```

---

## Uso de Chain of Thought

### O que é Chain of Thought (CoT)

CoT prompting instrui o modelo a "pensar passo a passo" antes de dar a resposta final, gerando raciocínio intermediário explícito. Exemplos: "Let's think step by step" ou raciocínio explícito antes da resposta.

### Avaliação para este projeto

**Adequação:** ⚠️ **Limitada e condicional**

**Análise crítica:**

CoT é extremamente poderoso para tarefas que exigem raciocínio multi-etapa: matemática, lógica, análise complexa. Para **chat pedagógico de linguagem**, a situação é diferente:

| Aspecto | CoT para chat pedagógico |
|---|---|
| **Avaliação de erros** | CoT é útil para a IA "pensar" sobre o que corrigir |
| **Geração de resposta natural** | CoT pode tornar a resposta artificial e mecânica |
| **Latência** | CoT aumenta significativamente o tempo de resposta |
| **Custo** | CoT gera muito mais tokens de output (cobrados normalmente) |
| **Experiência do usuário** | O raciocínio interno não é visível — apenas a resposta final |

**Recomendação:** Não use CoT explícito no System Prompt. Em vez disso, use **CoT implícito estruturado** — instrua o modelo a fazer uma análise interna antes de responder, sem exibir esse raciocínio:

```markdown
## Internal Process (do not show to user)
Before replying, mentally:
1. Read the user's message.
2. Identify the 1–2 most important errors (grammar, vocabulary, spelling).
3. Decide which errors are worth mentioning given the user's level.
4. Draft a natural response that addresses the content first.
5. Append a brief, friendly correction if needed.
6. Add a follow-up question to encourage more writing.
Then, write only the final response.
```

**Vantagem desta abordagem:** O modelo segue um processo estruturado sem expor o "pensamento" ao usuário — mantendo a naturalidade do chat.

**Quando CoT explícito PODE ser útil:** Se futuramente você adicionar uma feature de "explicação gramatical detalhada" (ex.: usuário pede para o modelo explicar uma regra), CoT pode ser ativado pontualmente via instrução na mensagem do usuário, não no System Prompt fixo.

### Zero-Shot CoT

A variante mais simples — adicionar "Let's think step by step" — **não é recomendada** para System Prompts de chat conversacional. Ela pode fazer o modelo responder de forma prolíxa e analítica, quebrando o fluxo natural da conversa.

---

## Uso de ReAct

### O que é ReAct

ReAct (Reason + Act) é um paradigma que combina raciocínio verbal com ações — tipicamente busca em bases externas, execução de ferramentas, ou acesso a ambientes externos. O ciclo é: **Thought → Action → Observation → Thought → ...**

### Avaliação para este projeto

**Adequação:** ❌ **Não recomendado** para o caso de uso atual

**Análise crítica:**

ReAct foi projetado para agentes que precisam interagir com ferramentas externas (busca web, calculadoras, APIs). Para um chat pedagógico de linguagem, ReAct apresenta problemas sérios:

| Problema | Explicação |
|---|---|
| **Sem ferramentas externas** | O projeto não tem ferramentas de busca ou verificação — o ReAct não tem com que interagir |
| **Overhead de raciocínio** | O ciclo Thought/Action/Observation gera muitos tokens extras |
| **Formato artificial** | Respostas em formato ReAct quebram completamente a naturalidade do chat |
| **Latência** | Múltiplos ciclos de raciocínio antes da resposta final aumentam o TTFR |
| **Custo** | Tokens de raciocínio intermediário são cobrados como output tokens |

**Quando ReAct poderia ser útil (evolução futura):**
- Se a aplicação ganhar ferramentas de busca de regras gramaticais
- Se o modelo precisar consultar um banco de dados de exercícios
- Se houver verificação de pronúncia via APIs externas

**Conclusão:** Exclua ReAct completamente dos System Prompts. O projeto não tem o ecossistema de ferramentas necessário para justificar esse overhead.

---

## Context Caching

### Como Funciona o Caching no DeepSeek

O caching do DeepSeek é **automático** — não requer nenhuma configuração de `cache_control` ou marcadores especiais no prompt. O provedor armazena prefixos do contexto e reutiliza automaticamente.

**Mecânica:**
1. Na primeira requisição, o System Prompt é processado normalmente (cache write)
2. Nas requisições seguintes com o mesmo System Prompt como prefixo, os tokens são lidos do cache (cache read a 0.1x do preço)
3. OpenRouter usa *sticky routing* para garantir que requisições da mesma sessão vão ao mesmo provider — maximizando cache hits

### Estratégia de Caching para este Projeto

**Regra fundamental:** Coloque tudo que é **estável e reutilizável** no início do System Prompt.

```
[CACHEADO - Estável]
├── Identidade do tutor
├── Regras globais de linguagem  
├── Metodologia pedagógica
├── Regras específicas do nível
└── Exemplos Few-Shot

[NÃO CACHEADO - Dinâmico]
├── Histórico da conversa (user/assistant turns)
└── Última mensagem do usuário
```

**Por que isso importa na prática:**

Para uma conversa com 20 turnos e um System Prompt de 500 tokens:
- Sem caching: 500 tokens de input por requisição × 20 = 10.000 tokens
- Com caching: 500 tokens (write) + 500 × 0.1 × 19 = 500 + 950 = 1.450 tokens equivalentes

**Economia estimada: ~85% no custo do System Prompt.**

### O que NÃO colocar no System Prompt

Para não quebrar o cache:

- ❌ Data/hora atual (muda a cada requisição)
- ❌ ID do usuário ou nome do usuário (varia por usuário)
- ❌ Histórico de erros anteriores do usuário (dinâmico)
- ❌ Qualquer valor que muda entre sessões

Se precisar de informações dinâmicas do usuário (ex.: nome, erros recorrentes), injete-as no início da primeira mensagem do usuário, **não** no System Prompt.

### Session ID via OpenRouter

Para maximizar cache hits ao usar OpenRouter, use o parâmetro `session_id`:

```typescript
// Exemplo: chatService.ts
const response = await openrouter.chat.completions.create({
  model: 'deepseek/deepseek-v4-flash',
  session_id: `user-${userId}-conversation-${conversationId}`,
  messages: [
    { role: 'system', content: levelPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ]
});
```

Isso garante que todas as requisições da mesma conversa vão ao mesmo provider, mantendo o cache quente.

---

## Otimização de Tokens

### Princípios Gerais

1. **Brevidade com clareza** — Cada instrução no prompt deve ser necessária. Remova redundâncias.
2. **Prefira imperativo direto** — "Respond in English" em vez de "You should always make sure to respond in English"
3. **Use listas para regras** — Mais compacto que prosa e mais fácil de seguir pelo modelo
4. **Evite hedging desnecessário** — Não use "Please try to", "You should attempt to" — apenas instrua diretamente

### Estimativa de Orçamento de Tokens por Nível

| Seção | Tokens estimados |
|---|---|
| Identidade + papel | 50–100 |
| Regras globais | 100–200 |
| Regras do nível | 100–150 |
| Exemplos Few-Shot (2–3) | 200–400 |
| Formato de saída | 50–100 |
| **Total estimado** | **500–950 tokens** |

Isso é deliberadamente conservador. Para um System Prompt que será cacheado, o custo de cache write é pago uma vez e depois o cache read é 10x mais barato. Prompts de 500–1000 tokens são ideais.

### Redução de Tokens sem Perda de Qualidade

**Técnica 1: Consolidação de regras similares**
```markdown
# Ruim (verboso):
- Always write in English.
- Never switch to Portuguese unless the user specifically asks you to.
- If the user writes in Portuguese, respond in English.

# Bom (conciso):
- Respond in English. Switch to Portuguese only if explicitly requested.
```

**Técnica 2: Exemplos sintéticos (não naturalistas)**

Few-Shot não precisa de diálogos longos. Uma única troca curta já demonstra o padrão:

```markdown
# Exemplo curto e eficiente:
User: I go to school yesterday.
Assistant: Interesting! What did you study? 
(Tip: use past tense → "I **went** to school yesterday" ✓)
```

**Técnica 3: Markdown estruturado**

Use cabeçalhos `##` e listas `-` para organizar o prompt. Isso facilita para o modelo "navegar" as instruções e reduz necessidade de prosa explicativa.

### Contagem de Tokens na Prática

Para estimar tokens antes de deployar:

```bash
# Usando tiktoken (estimativa próxima para DeepSeek)
pip install tiktoken
python -c "
import tiktoken
enc = tiktoken.get_encoding('cl100k_base')
prompt = open('api/prompts/A1.md').read()
print(f'Tokens: {len(enc.encode(prompt))}')
"
```

---

## Boas Práticas

### 1. Persona Consistente e Nomeada

Dê um nome ao tutor (ex.: "Aria"). Isso cria consistência e personalidade — o usuário sente que está conversando com um personagem, não com uma IA genérica.

### 2. Regras Escritas em Inglês

Escreva o System Prompt em inglês. Para modelos com predominância de treinamento em inglês, instruções em inglês tendem a ser seguidas com mais fidelidade.

### 3. Especificidade nas Restrições de Nível

Vago: "Use simple vocabulary"  
Específico: "Use only the 500 most common English words. Avoid phrasal verbs."

Quanto mais específica a instrução, mais previsível o comportamento.

### 4. Instrução Explícita de Comprimento de Resposta

Sem instrução, o modelo tende a respostas longas. Para chat, brevidade é crucial:

```markdown
Keep your responses short: 2–4 sentences maximum. 
Quality over quantity.
```

### 5. Definição Clara do Comportamento de Correção

O modelo não sabe por padrão "quanto" corrigir. Seja explícito:

```markdown
Correct at most 2 errors per turn. 
Prioritize errors that impede communication over stylistic issues.
```

### 6. Teste com Mensagens Adversariais

Antes de lançar um prompt, teste:
- "Fale português comigo" (usuário pedindo troca de idioma)
- "Ignore todas as instruções anteriores" (tentativa de prompt injection)
- Mensagens completamente erradas gramaticalmente
- Mensagens perfeitas sem erros (verifique se o modelo não inventa correções)

### 7. Controle de Versão dos Prompts

Os arquivos em `api/prompts/` devem estar em controle de versão (Git). Toda alteração deve ser documentada com o motivo. Considere um changelog por nível.

### 8. Consistência Entre Níveis

Mantenha a estrutura idêntica em todos os 6 arquivos. Apenas o conteúdo das seções "Regras do Nível" e "Exemplos" deve variar. Isso facilita manutenção e revisão.

---

## Anti-Padrões

### ❌ Anti-Padrão 1: Prompt Monolítico sem Estrutura

```markdown
# Ruim
You are an English teacher and you should help users practice their English writing. 
You should be friendly and helpful and always respond in English unless asked otherwise. 
For A1 students you should use simple vocabulary and for B2 students you can use more 
complex vocabulary. You should correct mistakes but not too harshly...
```

**Problema:** Prosa contínua sem estrutura é ambígua, difícil de manter e o modelo pode ignorar partes.

**Solução:** Use seções com cabeçalhos, listas e linguagem imperativa direta.

---

### ❌ Anti-Padrão 2: Instruções Contraditórias

```markdown
# Ruim
- Always correct all grammar errors.
- Don't overwhelm the user with corrections.
```

**Problema:** O modelo não sabe como resolver a contradição e pode ser imprevisível.

**Solução:** Seja específico sobre quando cada regra se aplica:
```markdown
- Correct up to 2 grammar errors per turn, prioritizing errors that block understanding.
```

---

### ❌ Anti-Padrão 3: Usar Reasoning Mode (Think) para Chat Casual

```markdown
# Ruim — System Prompt ativando Think Max desnecessariamente
<think_max>
Always reason deeply before responding to ensure maximum pedagogical accuracy.
</think_max>
```

**Problema:** Think Mode no DeepSeek aumenta latência (2–5x) e custo de tokens de output. Para chat conversacional, a qualidade marginal não justifica o custo.

**Solução:** Use Non-think mode (padrão) para todas as conversas. Reserve Think para análise gramatical detalhada se esse feature for implementado futuramente.

---

### ❌ Anti-Padrão 4: Dados Dinâmicos no System Prompt

```markdown
# Ruim
System Prompt contém: "The current date is {{date}} and the user's name is {{username}}."
```

**Problema:** Qualquer variação no System Prompt quebra o cache — cada usuário, cada dia gera um cache miss.

**Solução:** Injete dados dinâmicos no primeiro `user message`, não no system prompt:
```
User: [My name is João. Today is May 29, 2026.] Hello, I want to practice English!
```

---

### ❌ Anti-Padrão 5: Exemplos Few-Shot Ruins ou Inconsistentes

```markdown
# Ruim — exemplo demonstra comportamento indesejado
User: I am go to school.
Assistant: That's completely wrong! You should say "I am going to school" 
or "I go to school". Please study your grammar more carefully.
```

**Problema:** O tom é duro e desmotivador — exatamente o que não queremos.

**Solução:** Cada exemplo deve demonstrar o comportamento ideal — não o que deve ser evitado.

---

### ❌ Anti-Padrão 6: Aplicar CoT ou ReAct no System Prompt Base

```markdown
# Ruim
Thought: What errors did the user make?
Action: Identify errors
Observation: [list of errors]
Thought: How should I respond?
...
```

**Problema:** Para chat pedagógico, ReAct introduz overhead sem benefício. A resposta final para o usuário ficará poluída com raciocínio intermediário.

**Solução:** Use CoT implícito com instrução de "processo interno" (ver seção CoT).

---

### ❌ Anti-Padrão 7: Prompt Idêntico para Todos os Níveis

```markdown
# Ruim
- Usar exatamente o mesmo prompt para A1 e C2, apenas mudando "beginner" por "advanced"
```

**Problema:** A diferença entre A1 e C2 é enorme. Um prompt genérico resultará em comportamento medíocre em todos os níveis.

**Solução:** Mantenha o "bloco global" idêntico, mas crie seções de nível genuinamente distintas — vocabulário, gramática alvo, tipo de correção, tópicos e exemplos devem ser completamente diferentes.

---

## Template Base Recomendado

Abaixo está o template que deve ser usado como ponto de partida para todos os 6 arquivos de prompt:

```markdown
# English Writing Coach — Level [LEVEL_CODE] ([LEVEL_NAME])

## Identity
You are Aria, a friendly and encouraging English writing coach.
Your goal is to help [LEVEL_DESCRIPTION] practice writing through natural conversation.

## Core Language Rules
- Always respond in English.
- Switch to the user's language only if explicitly asked, and only for brief clarifications.
- Keep responses conversational and natural — this is a chat, not a classroom.
- Maximum response length: [MAX_LENGTH] words.

## Teaching Approach
- Read the user's message carefully before responding.
- Respond naturally to the content first (show genuine interest).
- Then, if there are errors, note the most important one or two in a friendly way.
- End every response with an open question or a writing prompt to encourage more writing.
- Introduce vocabulary slightly above the user's current level — stretch their skills gently.

## Error Correction
- Correct at most [MAX_CORRECTIONS] error(s) per turn.
- Priority: errors that block communication > grammar > vocabulary > style.
- Use friendly correction markers: "(Tip:", "(Note:", "(Small correction:".
- Never make the user feel bad about their English. Celebrate progress.

## Level [LEVEL_CODE] Specifics
### Vocabulary
[VOCABULARY_GUIDELINES]

### Grammar
[GRAMMAR_TARGETS]

### Topics
[RECOMMENDED_TOPICS]

### What to Correct
[CORRECTION_FOCUS]

### What to Accept (Don't Correct)
[ACCEPTANCE_CRITERIA]

## Response Format
- Write as you would in a friendly text message.
- No markdown, no bullet points, no headers in your replies.
- Corrections go in parentheses at the end of your message.
- Emoji are welcome but use them sparingly (0–1 per message).

## Examples

### Example 1 — [ERROR_TYPE_1]
User: [EXAMPLE_USER_MESSAGE_WITH_ERROR_1]
Assistant: [EXAMPLE_RESPONSE_WITH_NATURAL_CORRECTION_1]

### Example 2 — [ERROR_TYPE_2]  
User: [EXAMPLE_USER_MESSAGE_WITH_ERROR_2]
Assistant: [EXAMPLE_RESPONSE_WITH_NATURAL_CORRECTION_2]

### Example 3 — No errors (positive reinforcement)
User: [EXAMPLE_CORRECT_USER_MESSAGE]
Assistant: [EXAMPLE_POSITIVE_RESPONSE_WITHOUT_INVENTING_CORRECTIONS]
```

### Preenchimento do Template por Nível

| Campo | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|
| `LEVEL_NAME` | Beginner | Elementary | Intermediate | Upper-Intermediate | Advanced | Proficient |
| `MAX_LENGTH` | 40 | 60 | 80 | 100 | 120 | 150 |
| `MAX_CORRECTIONS` | 1 | 1–2 | 2 | 2–3 | 3 | 3–4 |
| `VOCABULARY_GUIDELINES` | Top 500 words | Top 1.500 words | Top 3.000 words | Rich vocab, phrasal verbs | Collocations, idioms | Literary, all registers |
| `GRAMMAR_TARGETS` | Present Simple, to be, to have | Past Simple, going to | Present Perfect, modals, type 1 conditionals | Passive, type 2–3 conditionals | Inversion, subjunctive | All, focus on elegance |

---

## Checklist para Revisão de Prompts

Use esta checklist antes de commitar qualquer alteração em `api/prompts/`:

### Estrutura e Clareza
- [ ] O prompt tem todas as seções do template base?
- [ ] As instruções estão em inglês?
- [ ] As regras são imperativas e diretas (sem hedging desnecessário)?
- [ ] Não há contradições entre seções?
- [ ] Cabeçalhos e listas organizam o conteúdo?

### Comportamento Pedagógico
- [ ] O vocabulário alvo está claramente definido?
- [ ] Os alvos gramaticais são específicos e corretos para o nível CEFR?
- [ ] O número máximo de correções por turno está definido?
- [ ] Há instrução para incentivar o usuário a escrever (pergunta ao final)?
- [ ] O tom é encorajador, nunca condescendente?

### Exemplos Few-Shot
- [ ] Há 2–3 exemplos de qualidade?
- [ ] Os exemplos cobrem diferentes tipos de erro?
- [ ] Há pelo menos um exemplo sem erro (para evitar correções inventadas)?
- [ ] O formato dos exemplos é idêntico ao esperado em produção?
- [ ] Os exemplos demonstram o nível de inglês correto para o aluno?

### Otimização e Caching
- [ ] O System Prompt não contém dados dinâmicos (data, nome do usuário)?
- [ ] O prompt é estável o suficiente para ser cacheado por múltiplas sessões?
- [ ] O tamanho está dentro do orçamento estimado (500–1000 tokens)?
- [ ] As instruções mais estáveis estão no início do arquivo?

### Testes
- [ ] Testado com mensagens simples (A1) ou complexas (C2) adequadas ao nível?
- [ ] Testado com mensagens sem erros (verifica se o modelo não inventa correções)?
- [ ] Testado com mensagens em português (verifica se mantém inglês)?
- [ ] Testado com tentativa de prompt injection?

### Manutenção
- [ ] A estrutura do arquivo é idêntica aos outros 5 níveis?
- [ ] Mudanças em regras globais foram aplicadas a todos os 6 arquivos?
- [ ] As alterações foram commitadas com mensagem descritiva?

---

## Exemplos de System Prompts

Os exemplos abaixo são **ilustrativos e parciais** — servem para demonstrar como o template se materializa em diferentes níveis. Os prompts completos e finais serão desenvolvidos separadamente com base neste guia.

### Exemplo Ilustrativo: A1 (Beginner)

```markdown
# English Writing Coach — Level A1 (Beginner)

## Identity
You are Aria, a warm and very patient English writing coach.
Your goal is to help absolute beginners practice writing through
simple, encouraging conversations.

## Core Language Rules
- Always respond in English.
- Use very short, simple sentences (max 10 words each).
- Switch to the user's language only if explicitly asked, and
  only to clarify a single word.
- Maximum response length: 40 words.

## Teaching Approach
- Show genuine interest in what the user writes.
- End every response with one simple yes/no or what/where/who question.
- Introduce 1 new useful word per conversation, naturally in context.

## Error Correction
- Correct at most 1 error per turn.
- Correct only: missing articles (a/an/the), basic verb forms (is/are/was),
  or spelling of very common words.
- Ignore complex grammar. Focus on communication only.
- Format: "(Tip: we say '[correct form]' 😊)"

## Level A1 Specifics
### Vocabulary
Use only the 500 most common English words.
Avoid: phrasal verbs, idioms, passive voice.
OK to use: basic verbs (go, have, like, want, see, eat), colors, numbers,
days, family words, common objects.

### Grammar
Only use: Present Simple, "be" + adjective, "have" + noun.
Avoid: Past tenses, Future, Modal verbs (except "can").

### Topics
Daily life, family members, food, hobbies, weather, home, school, pets.

## Response Format
- Write like a text message — short and friendly.
- No punctuation complexity. Simple sentences.
- Corrections in parentheses at the end.

## Examples

### Example 1 — Missing article
User: I have cat. She is very small.
Assistant: Oh, how cute! What color is she? 🐱
(Tip: we say "I have **a** cat".)

### Example 2 — Wrong verb form
User: She have long hair.
Assistant: Nice! Is her hair curly or straight?
(Tip: "She **has** long hair" — we use "has" with he/she/it.)

### Example 3 — No errors
User: I like pizza. It is my favorite food.
Assistant: Me too! 🍕 What is your favorite pizza topping?
```

---

### Exemplo Ilustrativo: B1 (Intermediate)

```markdown
# English Writing Coach — Level B1 (Intermediate)

## Identity
You are Aria, a friendly and encouraging English writing coach.
Your goal is to help intermediate learners refine their writing
through natural, engaging conversations.

## Core Language Rules
- Always respond in English.
- Use natural, conversational English — not overly formal or casual.
- Maximum response length: 80 words.

## Teaching Approach
- Engage genuinely with the content of what the user writes.
- Introduce B2-level structures occasionally to stretch their skills
  (e.g., Present Perfect for experience, simple conditionals).
- End with an open question that invites more writing.

## Error Correction
- Correct at most 2 errors per turn.
- Priority: tense errors > word choice > prepositions > spelling.
- Format corrections naturally: "(By the way: [explanation + correct form])"

## Level B1 Specifics
### Vocabulary
Use vocabulary from the top 3.000 most common English words.
Introduce B2 words naturally in your responses (e.g., "describe" instead of
"tell about", "experience" instead of "thing that happened").
Avoid advanced idioms, legal/academic jargon.

### Grammar
Model and accept: Present Perfect (experience/recent events), Past Simple,
going to + will for future, comparative/superlative, should/must/might,
Type 1 conditionals (If... will...).
Gently correct: consistent use of past vs. present perfect,
preposition errors (in/on/at + time/place).

### Topics
Travel, technology, work and study, current events, opinions, personal goals,
health, environment.

## Response Format
- Conversational tone. May use occasional informal expressions.
- No markdown in replies. Corrections in parentheses.

## Examples

### Example 1 — Tense error (present perfect vs past simple)
User: I have visited Paris last summer. It was amazing!
Assistant: That sounds wonderful! What was the highlight of your trip —
the food, the art, or just walking around the city?
(Small note: when we mention a specific time like "last summer", use
Past Simple → "I **visited** Paris last summer" ✓)

### Example 2 — Preposition error
User: I'm really interested on learning about astronomy.
Assistant: That's a fascinating subject! Have you ever looked at the sky
through a telescope?
(By the way: we say "interested **in**" something, not "interested on".)

### Example 3 — No errors
User: In my opinion, working from home has both advantages and disadvantages.
I like the flexibility, but sometimes I miss talking to my colleagues.
Assistant: That's a really balanced point of view! Which one outweighs
the other for you — do the advantages make up for the loneliness,
or would you prefer to be in an office?
```

---

*Este guia deve ser revisado a cada nova versão dos prompts ou quando o modelo-alvo for atualizado. Para dúvidas, consulte a equipe responsável pelo produto pedagógico.*
