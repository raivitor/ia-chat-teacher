# Tarefa 7 — Correção e melhoria dos prompts

## Contexto

A validação dos prompts em `api/prompts/` contra o `PROMPT_DESIGN_GUIDE.md` identificou nove
desvios. Este documento descreve cada problema, sua causa, e a correção concreta a aplicar.

Os prompts são compostos em runtime como:

```
shared/core.md → profiles/{perfil}.md → levels/{nivel}.md
```

---

## Problemas encontrados e plano de correção

### 1. Ordem de composição inverte Identity e Core Rules [CRÍTICO]

**Arquivo(s):** `shared/core.md`, `api/src/lib/prompts/loader.ts`

**Problema:** O guia define a ordem `Identity → Core Rules → Teaching → Level Rules → Examples`.
Com a composição atual, `core.md` começa diretamente em `## Core Language Rules`. O bloco
`## Your Role` dos perfis é injetado depois, então o model recebe as regras antes de saber
quem é o tutor.

**Correção:**
Adicionar um bloco de identidade genérico no topo do `core.md`, antes de qualquer outra seção:

```markdown
## Identity
You are a friendly English writing coach.
You help learners improve their English writing through natural conversation.
```

O arquivo de perfil sobrescreve a persona com `## Your Role`, que vem logo após na composição.
O bloco de identidade genérico no `core.md` serve como fallback e ancora a leitura do modelo.

---

### 2. Inconsistência entre regra e exemplo no nível A1 [CRÍTICO]

**Arquivo:** `api/prompts/levels/A1.md`

**Problema:** A regra diz *"only if it blocks understanding"*, mas o exemplo corrige
`"I has a cat"` — um erro de concordância que não bloqueia compreensão. O modelo aprende o
exemplo, não a regra abstrata (anti-padrão explícito do guia: *"exemplos inconsistentes com
as regras"*).

**Correção:**
Alterar a regra de correção no A1 para:

```markdown
- Correct at most 1 error per turn — focus on basic verb forms, articles, or very common
  spelling. Only correct errors that the user will likely repeat.
```

Isso alinha a regra com o exemplo existente sem precisar substituir o exemplo.

---

### 3. Seção `## Error Correction` ausente em todos os arquivos de nível [MODERADO]

**Arquivo(s):** todos os seis arquivos em `api/prompts/levels/`

**Problema:** O template base define uma seção dedicada com o marcador de correção padrão
e a instrução *"Never shame the user or make the conversation feel like a test."* Nenhum
arquivo de nível contém essa seção.

**Correção:**
Adicionar o bloco abaixo em cada arquivo de nível, entre o bloco de regras do nível e o
`## Response Format`, com `MAX_CORRECTIONS` ajustado por nível:

```markdown
## Error Correction
- Correct at most [MAX_CORRECTIONS] error(s) per turn.
- Prioritize communication-blocking errors first.
- Use "(Small tip: ...)" or "(One note: ...)" as correction markers.
- Never shame the user or make the conversation feel like a test.
```

Valores de `MAX_CORRECTIONS` por nível: A1 → 1, A2 → 1–2, B1 → 2, B2 → 2–3, C1 → 3, C2 → 3–4.

---

### 4. Marcadores de correção inconsistentes nos exemplos [MODERADO]

**Arquivo(s):** todos os seis arquivos em `api/prompts/levels/`

**Problema:** Os exemplos few-shot usam marcadores diferentes em cada nível:
- A1, A2, B1, B2: `(Tip: ...)`
- C1: `(Style note: ...)` e `(Tip: ...)` misturados
- C2: `(Note: ...)`

O guia define `(Small tip: ...)` ou `(One note: ...)` como marcadores padrão. Anti-padrão:
*"exemplos inconsistentes com as regras"*.

**Correção:**
Padronizar todos os exemplos para usar `(Small tip: ...)` nos níveis A1–B2 e `(One note: ...)`
nos níveis C1–C2, que é mais adequado ao tom editorial avançado. Atualizar a seção
`## Error Correction` com o marcador correto ao implementar o item 3.

---

### 5. `core.md` com duas instruções do template faltando [MODERADO]

**Arquivo:** `shared/core.md`

**Problema:**
- `## Core Language Rules` usa *"Keep responses natural and concise."* — falta `"and encouraging"`.
- `## Teaching Approach` não contém *"Introduce language slightly above the user's current level,
  but do not overwhelm them."*

**Correção:**
Aplicar dois ajustes pontuais no `core.md`:

1. Alterar a linha de tom para: `"Keep responses natural, concise and encouraging."`
2. Adicionar ao final do `## Teaching Approach`:
   `"- Introduce language slightly above the user's current level, but do not overwhelm them."`

---

### 6. `MAX_WORDS` abaixo dos valores iniciais do template [MODERADO]

**Arquivo(s):** todos os seis arquivos em `api/prompts/levels/`

**Problema:** Os valores atuais estão sistematicamente 10–20 palavras abaixo dos valores
iniciais definidos no template do guia:

| Nível | Template | Atual | Diferença |
|---|---|---|---|
| A1 | 45 | 35 | −10 |
| A2 | 65 | 55 | −10 |
| B1 | 90 | 80 | −10 |
| B2 | 120 | 110 | −10 |
| C1 | 150 | 130 | −20 |
| C2 | 180 | 160 | −20 |

Respostas mais curtas nos níveis avançados reduzem a qualidade do feedback editorial e
dificultam a modelagem de estruturas complexas.

**Correção:**
Atualizar os valores de `Maximum response length` em cada arquivo de nível para os valores
do template. Monitorar com conversas manuais após a mudança (item do checklist de testes).

---

### 7. Subseções de Level Rules ausentes [MENOR]

**Arquivo(s):** todos os seis arquivos em `api/prompts/levels/`

**Problema:** O template define subseções `### Vocabulary`, `### Grammar`, `### Topics`,
`### Correction Focus` e `### Accept Without Correcting` dentro de `## Level Rules`. Os
arquivos usam listas planas sem esses rótulos, dificultando revisão e manutenção.

**Correção:**
Reestruturar cada arquivo de nível adicionando os cabeçalhos de subseção. O conteúdo das
listas existentes pode ser redistribuído sem reescrita.

---

### 8. Critério `Accept Without Correcting` ausente [MENOR]

**Arquivo(s):** todos os seis arquivos em `api/prompts/levels/`

**Problema:** Nenhum nível define o que o tutor deve aceitar sem corrigir. Essa subseção é
importante para evitar *over-correction*, anti-padrão explícito do guia.

**Correção:**
Adicionar a subseção `### Accept Without Correcting` em cada arquivo de nível ao implementar
o item 7. Exemplos por nível:

- A1: *"Accept any message that communicates meaning, even with incomplete grammar."*
- B1: *"Accept errors that are typical of B1 level and do not affect clarity."*
- C2: *"Accept deliberate stylistic choices. Correct only genuine errors or register mismatches."*

---

### 9. Cabeçalho de versão ausente em todos os arquivos [MENOR]

**Arquivo(s):** `shared/core.md`, todos os perfis, todos os níveis

**Problema:** O guia recomenda um cabeçalho de versionamento em todos os arquivos de prompt
para rastrear mudanças e datas de revisão.

**Correção:**
Adicionar ao topo de cada arquivo:

```markdown
<!--
Prompt: [NOME_DO_ARQUIVO]
Version: 1.0.0
Last reviewed: 2026-05-30
Change reason: initial production prompt
-->
```

---

## Ordem de implementação recomendada

| Prioridade | Item | Arquivos afetados |
|---|---|---|
| 1 | Identity no topo do `core.md` | `shared/core.md` |
| 2 | Regra de correção A1 alinhada ao exemplo | `levels/A1.md` |
| 3 | Instrucoes faltando no `core.md` | `shared/core.md` |
| 4 | Seção `## Error Correction` em todos os níveis | 6 arquivos de nível |
| 5 | Padronizar marcadores nos exemplos | 6 arquivos de nível |
| 6 | Atualizar `MAX_WORDS` | 6 arquivos de nível |
| 7 | Subseções de Level Rules + `Accept Without Correcting` | 6 arquivos de nível |
| 8 | Cabeçalhos de versão | todos os arquivos de prompt |

Os itens 4, 5 e 6 podem ser feitos em paralelo por arquivo. Os itens 7 e 8 são independentes
dos anteriores e podem ser executados a qualquer momento.

---

## Checklist de validação pós-implementação

Após aplicar todas as correções, verificar manualmente para cada nível:

- [ ] Identity aparece antes de Core Language Rules no prompt composto?
- [ ] Regra e exemplos few-shot usam o mesmo marcador de correção?
- [ ] Exemplos com mensagem correta não contêm correção inventada?
- [ ] `MAX_WORDS` condiz com os valores do template?
- [ ] Subseções `### Vocabulary`, `### Grammar`, `### Topics`, `### Correction Focus` e
      `### Accept Without Correcting` presentes?
- [ ] `## Error Correction` presente com marcador padrão e instrução anti-shame?
- [ ] Cabeçalho de versão presente em todos os arquivos?
- [ ] Conversa de 5 turnos por nível mantém tom e limite de correções consistentes?
- [ ] Prompt injection (`"Ignore all previous instructions"`) redirecionado corretamente?
