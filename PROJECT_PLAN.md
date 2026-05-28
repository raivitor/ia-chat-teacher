# PROJECT_PLAN.md — English Writing Coach

## 1. Visão Geral

Aplicação web full-stack para prática de escrita em inglês via conversação com IA. O assistente adapta seu comportamento ao nível CEFR selecionado pelo usuário (A1–C2), utiliza streaming de respostas e persiste todo o histórico de conversas para análise futura.

---

## 2. Decisões de Arquitetura

### 2.1 Stack

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework web | Next.js 15 (App Router) | Suporte nativo a Route Handlers para streaming, SSR, e coexistência de UI + API |
| LLM | Vercel AI SDK + OpenRouter | Abstração de provider, streaming nativo, suporte a tools futuro, compatível com OpenAI API |
| Banco de dados | SQLite via Drizzle ORM | Simples, sem servidor, facilmente evoluível para Postgres, alinhado ao padrão já adotado no workspace |
| Linguagem | TypeScript | Tipagem estática, tooling superior, consistência com o restante do projeto |

### 2.2 Por que Vercel AI SDK com OpenRouter?

O Vercel AI SDK expõe o OpenRouter como provider compatível com a interface OpenAI. Isso significa:
- Troca de modelo com 1 linha (`model: "google/gemma-4-31b-it:free"` → qualquer outro)
- `streamText` + hook `useChat` entregam streaming sem boilerplate
- Suporte nativo a tools para funcionalidades futuras (busca na web, correção automática)

### 2.3 Estrutura de Diretórios

O projeto **reutiliza as pastas `api/` e `web/` já existentes** no workspace. Nenhum novo projeto raiz será criado.

```
api/                                   ← Backend Express existente
├── prompts/                           # System prompts por nível (Markdown) — NOVO
│   ├── A1.md
│   ├── A2.md
│   ├── B1.md
│   ├── B2.md
│   ├── C1.md
│   └── C2.md
├── drizzle/                           # Migrations (já existe)
├── src/
│   ├── app.ts                         # Registrar novas rotas — MODIFICAR
│   ├── config/
│   │   └── cors.ts                    # Existente
│   ├── controllers/
│   │   ├── itemController.ts          # Existente
│   │   ├── chatController.ts          # NOVO
│   │   └── conversationController.ts  # NOVO
│   ├── database/
│   │   ├── client.ts                  # Existente
│   │   └── schema.ts                  # Adicionar tabelas — MODIFICAR
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── client.ts              # Provider OpenRouter — NOVO
│   │   │   └── config.ts              # Constantes de modelo — NOVO
│   │   └── prompts/
│   │       └── loader.ts              # Carregamento dinâmico de prompts — NOVO
│   ├── routes/
│   │   ├── routes.ts                  # Registrar novas rotas — MODIFICAR
│   │   ├── chatRoutes.ts              # NOVO
│   │   └── conversationRoutes.ts      # NOVO
│   ├── schemas/
│   │   ├── item.schema.ts             # Existente
│   │   ├── chat.schema.ts             # NOVO
│   │   └── conversation.schema.ts     # NOVO
│   ├── services/
│   │   ├── itemService.ts             # Existente
│   │   ├── chatService.ts             # NOVO
│   │   └── conversationService.ts     # NOVO
│   └── types/
│       ├── conversation.ts            # NOVO
│       ├── message.ts                 # NOVO
│       └── level.ts                   # NOVO
└── .env                               # Adicionar OPENROUTER_API_KEY

web/                                   ← Frontend Next.js existente
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Existente
│   │   ├── page.tsx                   # Redirect para /onboarding — MODIFICAR
│   │   ├── onboarding/
│   │   │   └── page.tsx               # Seleção de nível — NOVO
│   │   └── chat/
│   │       ├── page.tsx               # Lista de conversas — NOVO
│   │       └── [id]/
│   │           └── page.tsx           # Interface de chat — NOVO
│   ├── components/
│   │   ├── onboarding/
│   │   │   └── LevelSelector.tsx      # NOVO
│   │   └── chat/
│   │       ├── ChatInterface.tsx       # NOVO
│   │       ├── MessageList.tsx         # NOVO
│   │       ├── MessageInput.tsx        # NOVO
│   │       └── ConversationSidebar.tsx # NOVO
│   └── lib/
│       └── api.ts                     # Funções tipadas para chamar api/ — NOVO
└── .env.local                         # NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 2.4 Modelo de Dados

```
conversations
  id          TEXT PK        (UUID v4 — usado nas URLs)
  seq         INTEGER        (auto-increment via COUNT+1 na criação — usado no título)
  level       TEXT NOT NULL  (A1|A2|B1|B2|C1|C2)
  model       TEXT NOT NULL  (ex: "google/gemma-4-31b-it:free")
  title       TEXT NOT NULL  (gerado na criação: "Conversa {seq} - dd/mm - HH:mm")
  created_at  TEXT NOT NULL  (ISO 8601)
  updated_at  TEXT NOT NULL  (ISO 8601)

messages
  id              TEXT PK
  conversation_id TEXT FK → conversations.id
  role            TEXT NOT NULL  (user|assistant|system)
  content         TEXT NOT NULL
  created_at      TEXT NOT NULL
```

> **Geração do título:** no momento da criação, `seq = SELECT COUNT(*) + 1 FROM conversations` (dentro da mesma transação). O título é formatado como `Conversa {seq} - dd/mm - HH:mm` usando a data/hora local do servidor. Nenhuma chamada extra ao LLM é necessária.

### 2.5 Fluxo de Dados — Streaming

```
[web/ — Browser]
  useChat (AI SDK UI)
      │
      │  POST http://localhost:3001/chat  { conversationId, messages }
      ▼
[api/ — Express Route Handler]
  1. Carrega conversation do DB para obter o level
  2. Carrega system prompt via loadPrompt(level)
  3. Persiste mensagem do usuário no DB
  4. Chama streamText (AI SDK Core) → OpenRouter
  5. result.pipeDataStreamToResponse(res)
  6. Persiste resposta do assistente via onFinish callback
      │
      │  Server-Sent Events (chunks de texto)
      ▼
[web/ — Browser]
  Renderiza tokens em tempo real
```

> O hook `useChat` do Vercel AI SDK UI aponta para a URL do servidor Express (`NEXT_PUBLIC_API_URL`). O CORS já está configurado em `api/src/config/cors.ts`.

### 2.6 Separação de Responsabilidades

| Projeto | Camada | Responsabilidade |
|---|---|---|
| `web/` | `app/` (pages) | Roteamento, layout, composição de componentes |
| `web/` | `components/` | Apresentação pura, sem lógica de negócio |
| `web/` | `lib/api.ts` | Funções tipadas para chamar a API do backend |
| `api/` | `controllers/` | Entrada HTTP, validação de request, orquestração |
| `api/` | `services/` | Regras de negócio (orquestra LLM + DB) |
| `api/` | `lib/ai/` | Integração com LLM (isolado, fácil de trocar) |
| `api/` | `lib/prompts/` | Carregamento de system prompts |
| `api/` | `database/` | Schema Drizzle + conexão SQLite |
| `api/` | `types/` | Contratos de dados compartilhados |

---

## 3. Tarefas por Fase

---

### Fase 1 — Fundação

---

#### Tarefa 1.1 — Preparação da Estrutura Existente

**Objetivo:** Adaptar os projetos `api/` e `web/` existentes para receber o código do English Writing Coach.

**Descrição:**
- Em `api/`: instalar novas dependências — `ai` (Vercel AI SDK), `@ai-sdk/openai`
- Em `web/`: instalar novas dependências — `ai` (Vercel AI SDK), `@ai-sdk/react`
- Criar estrutura de novos diretórios em `api/src/`: `lib/ai/`, `lib/prompts/`, `types/`
- Criar estrutura de novos diretórios em `web/src/`: `components/onboarding/`, `components/chat/`, `lib/`
- Adicionar `OPENROUTER_API_KEY` ao `.env` de `api/`
- Adicionar `NEXT_PUBLIC_API_URL` ao `.env.local` de `web/`
- Criar diretório `api/prompts/` para os system prompts

**Dependências:** Nenhuma

**Critérios de Aceite:**
- `api/` e `web/` continuam iniciando sem erros após instalação das dependências
- Estrutura de diretórios conforme seção 2.3
- TypeScript compila sem erros em ambos os projetos (`tsc --noEmit`)
- Variáveis de ambiente documentadas nos arquivos `.env.example` de cada projeto

**Complexidade:** Baixa

---

#### Tarefa 1.2 — Schema do Banco de Dados

**Objetivo:** Adicionar as tabelas `conversations` e `messages` ao schema Drizzle já existente em `api/`.

**Descrição:**
- Adicionar as tabelas `conversations` e `messages` em `api/src/database/schema.ts` conforme seção 2.4
- Incluir coluna `seq` com lógica de auto-incremento via `COUNT(*)+1` na criação
- Executar `drizzle-kit generate` para gerar a nova migration em `api/drizzle/`
- O `drizzle.config.ts` e `api/src/database/client.ts` já existem — não recriar

**Dependências:** Tarefa 1.1

**Critérios de Aceite:**
- Nova migration SQL gerada em `api/drizzle/`
- Schema tipado com todas as colunas de `conversations` e `messages`
- `drizzle-kit push` ou script de migrate aplica as tabelas sem erros
- Tabelas pré-existentes (`items`) não são afetadas

**Complexidade:** Baixa

---

#### Tarefa 1.3 — Estrutura de Prompts

**Objetivo:** Criar os arquivos de system prompt para cada nível e o loader dinâmico.

**Descrição:**
- Criar diretório `api/prompts/`
- Criar arquivos com placeholder: `A1.md`, `A2.md`, `B1.md`, `B2.md`, `C1.md`, `C2.md`
- Cada arquivo deve conter comentário indicando que o prompt ainda será definido
- Criar `api/src/lib/prompts/loader.ts` com função `loadPrompt(level: Level): Promise<string>` usando `fs/promises`
- Validar se o nível é um valor permitido (A1–C2)

**Dependências:** Tarefa 1.1, Tarefa 1.4

**Critérios de Aceite:**
- Os 6 arquivos `.md` existem em `api/prompts/`
- `loadPrompt("A1")` retorna o conteúdo de `api/prompts/A1.md`
- `loadPrompt("XX")` lança erro tipado para nível inválido
- Loader resolve o path relativo ao processo Node.js (`process.cwd()`), não ao bundle

**Complexidade:** Baixa

---

#### Tarefa 1.4 — Tipos Compartilhados

**Objetivo:** Definir os contratos de TypeScript usados em toda a aplicação.

**Descrição:**
- Criar `api/src/types/level.ts` com `Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2"` e array `LEVELS`
- Criar `api/src/types/conversation.ts` com `Conversation` e `ConversationWithMessages`
- Criar `api/src/types/message.ts` com `Message` e `MessageRole`

**Dependências:** Tarefa 1.1

**Critérios de Aceite:**
- Tipos exportados e sem `any`
- Tipos derivados do schema Drizzle (`InferSelectModel`) onde pertinente
- TypeScript compila sem erros

**Complexidade:** Baixa

---

### Fase 2 — Integração com LLM

---

#### Tarefa 2.1 — Cliente OpenRouter (Vercel AI SDK)

**Objetivo:** Configurar o provider de LLM com o Vercel AI SDK apontando para o OpenRouter dentro do `api/`.

**Descrição:**
- Criar `api/src/lib/ai/config.ts` com `DEFAULT_MODEL = "google/gemma-4-31b-it:free"` e parâmetros default
- Criar `api/src/lib/ai/client.ts` instanciando o provider via `@ai-sdk/openai` com `baseURL: "https://openrouter.ai/api/v1"` e `OPENROUTER_API_KEY` do `process.env`
- Exportar `getChatModel(modelId?: string)` que retorna o modelo configurado
- API key lida exclusivamente do ambiente do servidor Express

**Dependências:** Tarefa 1.1

**Critérios de Aceite:**
- `getChatModel()` retorna instância válida do model provider
- Trocar o modelo requer alterar apenas `config.ts`
- Sem credenciais hardcoded
- `OPENROUTER_API_KEY` ausente lança erro descritivo na inicialização

**Complexidade:** Baixa

---

#### Tarefa 2.2 — Rota de Chat com Streaming (Express)

**Objetivo:** Implementar o endpoint `POST /chat` no servidor Express que recebe mensagens e retorna resposta em streaming.

**Descrição:**
- Criar `api/src/controllers/chatController.ts`
- Receber body: `{ conversationId: string, messages: CoreMessage[] }`
- Validar os campos com schema Zod em `api/src/schemas/chat.schema.ts`
- Chamar `chatService.streamResponse(conversationId, messages, res)` que:
  - Busca a conversation no DB para obter o `level`
  - Carrega system prompt via `loadPrompt(level)`
  - Persiste a mensagem do usuário no DB
  - Chama `streamText` do Vercel AI SDK
  - Usa `result.pipeDataStreamToResponse(res)` para transmitir para o cliente
  - Persiste resposta do assistente via callback `onFinish`
- Criar `api/src/routes/chatRoutes.ts` e registrar em `api/src/routes/routes.ts`

**Dependências:** Tarefa 2.1, Tarefa 1.3, Tarefa 3.1, Tarefa 3.2

**Critérios de Aceite:**
- Endpoint responde com `Content-Type: text/event-stream`
- Tokens chegam ao cliente em tempo real (verificável via `curl -N`)
- Mensagem do assistente é salva no DB após o stream completar
- Erros retornam JSON com status HTTP adequado (400, 404, 500)
- `conversationId` inválido retorna 404

**Complexidade:** Média

---

### Fase 3 — Persistência

---

#### Tarefa 3.1 — Service de Conversas

**Objetivo:** Implementar as operações de banco de dados para conversas.

**Descrição:**
- Criar `api/src/services/conversationService.ts` com:
  - `createConversation(data: { level: Level }): Conversation`
    - Gera UUID v4 para `id`
    - Calcula `seq = SELECT COUNT(*) + 1 FROM conversations` (mesma transação)
    - Gera `title = "Conversa {seq} - dd/mm - HH:mm"` usando data/hora local do servidor
    - Usa `DEFAULT_MODEL` de `lib/ai/config.ts`
  - `listConversations(): Conversation[]` — ordenadas por `created_at DESC`
  - `getConversation(id: string): ConversationWithMessages | null`
  - `deleteConversation(id: string): void`

**Dependências:** Tarefa 1.2, Tarefa 1.4, Tarefa 2.1

**Critérios de Aceite:**
- Todas as funções tipadas com os tipos de `api/src/types/`
- Título gerado corretamente no formato "Conversa {N} - dd/mm - HH:mm"
- `getConversation` inclui mensagens ordenadas por `created_at ASC`
- Queries Drizzle sem SQL raw
- `seq` é único e sequencial mesmo sob inserções concorrentes (transação)

**Complexidade:** Baixa

---

#### Tarefa 3.2 — Service de Mensagens

**Objetivo:** Implementar as operações de banco de dados para mensagens.

**Descrição:**
- Criar `api/src/services/chatService.ts` com:
  - `saveMessage(data: { conversationId: string, role: MessageRole, content: string }): Message`
    - Gera UUID v4 para `id`
    - Atualiza `updated_at` da conversa pai (via transação Drizzle)
  - `streamResponse(conversationId: string, messages: CoreMessage[], res: Response): Promise<void>`
    - Orquestra: busca conversa → carrega prompt → persiste mensagem do usuário → stream → persiste resposta

**Dependências:** Tarefa 1.2, Tarefa 1.4, Tarefa 2.1

**Critérios de Aceite:**
- `saveMessage` gera UUID v4 para o `id`
- `saveMessage` atualiza `updated_at` da conversa pai em transação
- Queries tipadas

**Complexidade:** Baixa

---

#### Tarefa 3.3 — API REST de Conversas (Express)

**Objetivo:** Expor endpoints HTTP para gerenciar conversas no servidor Express.

**Descrição:**
- Criar `api/src/controllers/conversationController.ts`:
  - `GET /conversations` → lista conversas (mais recentes primeiro)
  - `POST /conversations` → cria nova conversa, body: `{ level: Level }`
  - `GET /conversations/:id` → retorna conversa com mensagens
  - `DELETE /conversations/:id` → remove conversa e mensagens
- Criar `api/src/schemas/conversation.schema.ts` com validação Zod do body
- Criar `api/src/routes/conversationRoutes.ts` e registrar em `api/src/routes/routes.ts`

**Dependências:** Tarefa 3.1

**Critérios de Aceite:**
- `POST /conversations` com `level` inválido retorna 400
- `GET /conversations/:id` inexistente retorna 404
- Respostas em JSON tipadas
- Controllers delegam toda lógica aos services

**Complexidade:** Baixa

---

### Fase 4 — Interface do Usuário

---

#### Tarefa 4.1 — Página de Onboarding (Seleção de Nível)

**Objetivo:** Implementar a tela inicial onde o usuário escolhe seu nível de inglês e inicia uma conversa.

**Descrição:**
- Criar `web/src/lib/api.ts` com funções tipadas para chamar os endpoints do `api/` (usando `NEXT_PUBLIC_API_URL`)
- Criar `web/src/components/onboarding/LevelSelector.tsx`:
  - Exibe os 6 níveis (A1–C2) como cards com nome e breve descrição CEFR
  - Na montagem, lê `localStorage.getItem("preferredLevel")` e pré-seleciona o nível
  - Ao confirmar, salva o nível no `localStorage` e chama `POST /conversations`
  - Redireciona para `/chat/[id]` após criação
- Criar `web/src/app/onboarding/page.tsx` que renderiza `LevelSelector`
- Modificar `web/src/app/page.tsx` para redirecionar para `/onboarding`

**Dependências:** Tarefa 3.3

**Critérios de Aceite:**
- Todos os 6 níveis são exibidos
- Nível anteriormente usado é pré-selecionado via `localStorage`
- Seleção cria conversa, salva nível no `localStorage` e navega para `/chat/[id]`
- Estado de loading durante criação da conversa
- Responsivo (mobile-friendly)

**Complexidade:** Baixa

---

#### Tarefa 4.2 — Interface de Chat

**Objetivo:** Implementar a tela de conversa com streaming de respostas em tempo real.

**Descrição:**
- Criar `web/src/components/chat/MessageList.tsx` — lista de mensagens com diferenciação visual entre `user` e `assistant`
- Criar `web/src/components/chat/MessageInput.tsx` — textarea + botão enviar, desabilitado durante streaming
- Criar `web/src/components/chat/ChatInterface.tsx` usando `useChat` do Vercel AI SDK:
  - `api: process.env.NEXT_PUBLIC_API_URL + "/chat"`
  - `body: { conversationId }` enviado em cada request
  - `initialMessages` populados com histórico do DB
  - Scroll automático para a última mensagem
- Criar `web/src/app/chat/[id]/page.tsx` — Server Component que busca conversa via `GET /conversations/:id` e passa histórico para `ChatInterface`

**Dependências:** Tarefa 2.2, Tarefa 3.3, Tarefa 4.1

**Critérios de Aceite:**
- Tokens do assistente aparecem em tempo real (streaming visível)
- Histórico de mensagens anteriores é exibido ao abrir uma conversa existente
- Input desabilitado durante geração de resposta
- Mensagem enviada aparece imediatamente (optimistic update do `useChat`)
- Erro de rede exibe feedback ao usuário

**Complexidade:** Média

---

#### Tarefa 4.3 — Sidebar de Conversas

**Objetivo:** Permitir ao usuário navegar entre conversas anteriores e criar novas.

**Descrição:**
- Criar `web/src/components/chat/ConversationSidebar.tsx`:
  - Lista conversas com título gerado (ex: "Conversa 3 - 28/05 - 14:32") e nível
  - Botão "Nova Conversa" → navega para `/onboarding`
  - Destaca a conversa ativa
- Criar `web/src/app/chat/layout.tsx` — busca lista de conversas via `GET /conversations` e passa para a sidebar

**Dependências:** Tarefa 3.3, Tarefa 4.2

**Critérios de Aceite:**
- Lista exibe o título no formato "Conversa {N} - dd/mm - HH:mm"
- Conversa ativa visualmente destacada
- Sidebar colapsável em telas pequenas (mobile)
- Lista atualizada ao criar nova conversa (navegação de volta à sidebar)

**Complexidade:** Baixa

---

### Fase 5 — Qualidade

---

#### Tarefa 5.1 — Testes Unitários dos Services

**Objetivo:** Garantir a corretude das operações de banco de dados em isolamento.

**Descrição:**
- O `api/` já possui estrutura de testes (Vitest/Jest) — utilizar o mesmo setup
- Criar testes para `conversationService.ts` e `chatService.ts` usando banco SQLite em memória (`:memory:`)
- Cobrir: criação com título correto, listagem, busca por ID, deleção, caso not-found
- Verificar formato do título gerado (regex `Conversa \d+ - \d{2}\/\d{2} - \d{2}:\d{2}`)

**Dependências:** Tarefa 3.1, Tarefa 3.2

**Critérios de Aceite:**
- Testes passam com `pnpm test` em `api/`
- Banco de teste isolado por arquivo de teste
- Cobertura de caminhos felizes e casos de erro
- Título gerado valida contra o regex esperado

**Complexidade:** Média

---

#### Tarefa 5.2 — Testes Unitários do Loader de Prompts

**Objetivo:** Garantir que o carregamento dinâmico de prompts funciona corretamente.

**Descrição:**
- Criar testes para `api/src/lib/prompts/loader.ts`
- Mockar `fs/promises` para evitar leitura de disco nos testes
- Testar: nível válido retorna conteúdo correto, nível inválido lança erro

**Dependências:** Tarefa 1.3

**Critérios de Aceite:**
- Testes sem leitura de disco real
- Cobre todos os 6 níveis válidos
- Cobre pelo menos 1 caso de nível inválido

**Complexidade:** Baixa

---

#### Tarefa 5.3 — Variáveis de Ambiente e Documentação

**Objetivo:** Documentar como configurar e rodar o projeto.

**Descrição:**
- Criar `api/.env.example` documentando `OPENROUTER_API_KEY` e demais variáveis
- Criar `web/.env.local.example` documentando `NEXT_PUBLIC_API_URL`
- Atualizar o `README.md` raiz do workspace com:
  - Pré-requisitos
  - Como rodar `api/` e `web/` juntos
  - Como configurar as variáveis de ambiente
  - Como trocar de modelo LLM (editar `api/src/lib/ai/config.ts`)

**Dependências:** Todas as tarefas anteriores

**Critérios de Aceite:**
- Desenvolvedor consegue rodar o projeto completo seguindo o README
- Todas as variáveis de ambiente documentadas com valor de exemplo

**Complexidade:** Baixa

---

## 4. Resumo das Fases

| Fase | Tarefas | Complexidade Total |
|---|---|---|
| 1 — Fundação | 1.1, 1.2, 1.3, 1.4 | Baixa |
| 2 — Integração LLM | 2.1, 2.2 | Baixa + Média |
| 3 — Persistência | 3.1, 3.2, 3.3 | Baixa |
| 4 — Interface | 4.1, 4.2, 4.3 | Baixa + Média + Baixa |
| 5 — Qualidade | 5.1, 5.2, 5.3 | Média + Baixa + Baixa |

**Ordem de implementação recomendada:**
1.1 → 1.4 → 1.2 → 1.3 → 2.1 → 3.1 → 3.2 → 3.3 → 2.2 → 4.1 → 4.2 → 4.3 → 5.1 → 5.2 → 5.3

> A tarefa 2.2 depende de 3.1/3.2 (para persistir mensagens). As demais dentro de cada fase são independentes e podem ser desenvolvidas em paralelo.

---

*Aguardando aprovação antes de iniciar qualquer implementação.*
