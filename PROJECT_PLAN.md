# PROJECT_PLAN.md — English Writing Coach

## 1. Visão Geral

Aplicação web full-stack para prática de escrita em inglês via conversação com IA. O assistente adapta seu comportamento ao nível CEFR selecionado pelo usuário (A1-C2), utiliza streaming de respostas e persiste todo o histórico de conversas para análise futura.

O projeto reutiliza o workspace atual:

- `web/`: Next.js 16 + React 19
- `api/`: Express + TypeScript + Drizzle + Postgres

---

## 2. Decisões de Arquitetura

### 2.1 Stack

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js 16 (App Router) + React 19 | Mantém a versão mais atual já adotada no `web/`, com App Router e Server Components |
| Backend | Express 5 + TypeScript | Mantém o backend existente, simples de testar e evoluir |
| LLM | Vercel AI SDK + `@openrouter/ai-sdk-provider` | Provider oficial do OpenRouter para AI SDK, streaming atual e suporte futuro a tools |
| Banco de dados | Postgres via Drizzle ORM | Mantém a infraestrutura existente do `api/`, com migrations e testes de integração |
| Testes | `node:test` + `supertest` | Mantém o padrão atual do backend |

### 2.2 Por que Vercel AI SDK com OpenRouter?

O OpenRouter possui provider oficial para Vercel AI SDK via `@openrouter/ai-sdk-provider`. A integração deve usar `createOpenRouter`, evitando configuração manual de provider OpenAI com `baseURL`.

Benefícios:

- Troca de modelo centralizada em `api/src/lib/ai/config.ts`
- Uso de APIs atuais do AI SDK para streaming em servidor Express
- Compatibilidade futura com tools, metadata, multimodalidade e UI message streams
- Menor acoplamento entre backend e fornecedor de modelo

Modelo inicial:

```text
google/gemma-4-31b-it:free
```

### 2.3 Estrutura de Diretórios

O projeto reutiliza as pastas `api/` e `web/` já existentes. Nenhum novo projeto raiz será criado.

```text
api/                                   # Backend Express existente
├── prompts/                           # System prompts por nível (Markdown) — NOVO
│   ├── A1.md                          # vazio
│   ├── A2.md                          # vazio
│   ├── B1.md                          # vazio
│   ├── B2.md                          # vazio
│   ├── C1.md                          # vazio
│   └── C2.md                          # vazio
├── drizzle/                           # Migrations existentes
├── src/
│   ├── app.ts                         # Mantém app.use('/api', router)
│   ├── config/
│   │   └── cors.ts                    # Existente
│   ├── controllers/
│   │   ├── itemController.ts          # Existente
│   │   ├── chatController.ts          # NOVO
│   │   └── conversationController.ts  # NOVO
│   ├── database/
│   │   ├── client.ts                  # Existente, Postgres
│   │   └── schema.ts                  # Adicionar tabelas — MODIFICAR
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── client.ts              # createOpenRouter — NOVO
│   │   │   └── config.ts              # Modelo default — NOVO
│   │   └── prompts/
│   │       └── loader.ts              # Carregamento dinâmico — NOVO
│   ├── routes/
│   │   ├── routes.ts                  # Registrar novas rotas — MODIFICAR
│   │   ├── chatRoutes.ts              # /api/chat — NOVO
│   │   └── conversationRoutes.ts      # /api/conversations — NOVO
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
└── .env.example                       # Adicionar OPENROUTER_API_KEY

web/                                   # Frontend Next.js 16 existente
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Existente
│   │   ├── page.tsx                   # Redirect para /onboarding — MODIFICAR
│   │   ├── onboarding/
│   │   │   └── page.tsx               # Seleção de nível — NOVO
│   │   └── chat/
│   │       ├── layout.tsx             # Sidebar — NOVO
│   │       ├── page.tsx               # Lista/redirect — NOVO
│   │       └── [id]/
│   │           └── page.tsx           # Interface de chat — NOVO
│   ├── components/
│   │   ├── onboarding/
│   │   │   └── LevelSelector.tsx      # NOVO
│   │   └── chat/
│   │       ├── ChatInterface.tsx      # NOVO
│   │       ├── MessageList.tsx        # NOVO
│   │       ├── MessageInput.tsx       # NOVO
│   │       └── ConversationSidebar.tsx # NOVO
│   └── lib/
│       └── api.ts                     # Cliente tipado para /api — NOVO
└── .env.local.example                 # NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 2.4 Modelo de Dados

Persistência em Postgres com Drizzle.

```text
conversations
  id          UUID PK        (defaultRandom, usado nas URLs)
  seq         INTEGER UNIQUE NOT NULL (gerado por sequence Postgres, id incremental do título)
  level       TEXT NOT NULL  (A1|A2|B1|B2|C1|C2)
  model       TEXT NOT NULL  (ex: "google/gemma-4-31b-it:free")
  title       TEXT NOT NULL  (ex: "Conversa 1 - 28/05 - 20:08")
  metadata    JSONB NOT NULL (default '{}')
  created_at  TIMESTAMPTZ NOT NULL
  updated_at  TIMESTAMPTZ NOT NULL

messages
  id              UUID PK
  conversation_id UUID FK -> conversations.id ON DELETE CASCADE
  role            TEXT NOT NULL  (user|assistant|system)
  content         TEXT NOT NULL
  parts           JSONB NOT NULL (AI SDK UIMessage parts, default '[]')
  metadata        JSONB NOT NULL (default '{}')
  created_at      TIMESTAMPTZ NOT NULL
```

Observações:

- `seq` deve ser gerado por uma sequence do Postgres e representa o `{id-incremental}` exibido no título. Não usar `COUNT(*) + 1`.
- O service deve obter o próximo `seq` no início da transação, montar o título final e inserir a conversa já com `seq` e `title` definitivos. Não usar título vazio ou provisório.
- `parts` preserva compatibilidade com `UIMessage` do AI SDK para tools e mensagens estruturadas no futuro.
- `metadata` permite registrar dados como `finishReason`, `usage`, provider, latência, versão do app e outros campos futuros.
- Neste momento não será salvo snapshot do system prompt.

### 2.5 Fluxo de Dados — Streaming

```text
[web/ — Browser]
  useChat + DefaultChatTransport
      │
      │ POST http://localhost:3001/api/chat
      │ { conversationId, message }
      ▼
[api/ — Express]
  1. Valida conversationId e a nova mensagem do usuário
  2. Busca a conversation no DB para obter level/model
  3. Carrega o histórico salvo no DB
  4. Carrega system prompt via loadPrompt(level)
  5. Persiste a nova mensagem do usuário
  6. Chama streamText com system prompt + histórico salvo + nova mensagem
  7. Transmite resposta via AI SDK UI stream para o Express response
  8. Persiste a resposta do assistente ao finalizar o stream
      │
      │ Streaming HTTP
      ▼
[web/ — Browser]
  Renderiza chunks em tempo real
```

Regras importantes:

- O backend aceita somente a nova mensagem do usuário enviada pelo frontend.
- O backend não confia em histórico enviado pelo cliente para montar contexto.
- O frontend deve configurar o transport do `useChat` para enviar somente `conversationId` e a última mensagem do usuário, por exemplo via `DefaultChatTransport` com `prepareSendMessagesRequest` ou transport customizado equivalente.
- Toda mensagem que passar pelo backend e for aceita deve ser salva no banco.
- A rota pública final será `/api/chat`, pois `app.ts` já monta `router` em `/api`.

### 2.6 Separação de Responsabilidades

| Projeto | Camada | Responsabilidade |
|---|---|---|
| `web/` | `app/` | Roteamento, layout e composição de telas |
| `web/` | `components/` | UI e interações locais |
| `web/` | `lib/api.ts` | Cliente tipado para `/api` |
| `api/` | `controllers/` | Entrada HTTP, status codes e delegação |
| `api/` | `schemas/` | Validação Zod de body/params |
| `api/` | `services/` | Regras de negócio, persistência e orquestração |
| `api/` | `lib/ai/` | Provider OpenRouter e configuração de modelo |
| `api/` | `lib/prompts/` | Carregamento de prompts por nível |
| `api/` | `database/` | Schema Drizzle + conexão Postgres |
| `api/` | `types/` | Contratos internos compartilhados |

---

## 3. Tarefas por Fase

---

### Fase 1 — Fundação

---

#### Tarefa 1.1 — Preparação da Estrutura Existente

**Objetivo:** Adaptar os projetos `api/` e `web/` existentes para receber o código do English Writing Coach.

**Descrição:**

- Em `api/`: instalar `ai` e `@openrouter/ai-sdk-provider`
- Em `web/`: instalar `ai` e `@ai-sdk/react`
- Criar diretórios em `api/src/`: `lib/ai/`, `lib/prompts/`, `types/`
- Criar diretórios em `web/src/`: `components/onboarding/`, `components/chat/`, `lib/`
- Adicionar `OPENROUTER_API_KEY` ao `api/.env.example`
- Adicionar `NEXT_PUBLIC_API_URL` ao `web/.env.local.example`
- Criar diretório `api/prompts/`

**Dependências:** Nenhuma

**Critérios de Aceite:**

- `api/` e `web/` continuam iniciando sem erros após instalação das dependências
- Estrutura de diretórios conforme seção 2.3
- TypeScript compila sem erros em ambos os projetos
- Variáveis de ambiente documentadas nos arquivos de exemplo
- Nenhum novo projeto raiz é criado

**Complexidade:** Baixa

---

#### Tarefa 1.2 — Schema Postgres do Banco de Dados

**Objetivo:** Adicionar as tabelas `conversations` e `messages` ao schema Drizzle existente em `api/`.

**Descrição:**

- Atualizar `api/src/database/schema.ts` usando `drizzle-orm/pg-core`
- Criar sequence Postgres para gerar o `seq` incremental das conversas
- Adicionar `conversations` com `seq` gerado pela sequence do Postgres
- Adicionar `messages` com FK para `conversations.id` e cascade delete
- Adicionar campos `metadata` e `parts` como `jsonb`
- Criar constraints/checks para `level` e `role` na migration
- Executar `npm run db:generate --prefix api`

**Dependências:** Tarefa 1.1

**Critérios de Aceite:**

- Nova migration SQL gerada em `api/drizzle/`
- `seq` usa sequence do Postgres, sem `COUNT(*) + 1`
- `metadata` e `parts` são persistidos como `jsonb`
- `level` aceita apenas A1, A2, B1, B2, C1, C2
- `role` aceita apenas user, assistant, system
- `npm run db:migrate --prefix api` aplica as tabelas sem erros
- Tabela pré-existente `items` não é afetada

**Complexidade:** Baixa

---

#### Tarefa 1.3 — Estrutura de Prompts

**Objetivo:** Criar os arquivos de system prompt para cada nível e o loader dinâmico.

**Descrição:**

- Criar arquivos vazios: `A1.md`, `A2.md`, `B1.md`, `B2.md`, `C1.md`, `C2.md`
- Criar `api/src/lib/prompts/loader.ts` com `loadPrompt(level: Level): Promise<string>`
- Validar se o nível é um valor permitido (A1-C2)
- Permitir retorno de string vazia, porque os prompts ainda não serão definidos

**Dependências:** Tarefa 1.1, Tarefa 1.4

**Critérios de Aceite:**

- Os 6 arquivos `.md` existem em `api/prompts/`
- Os arquivos estão vazios
- `loadPrompt("A1")` retorna o conteúdo de `api/prompts/A1.md`
- `loadPrompt("XX")` lança erro tipado para nível inválido
- Loader resolve o path relativo a `process.cwd()`

**Complexidade:** Baixa

---

#### Tarefa 1.4 — Tipos Compartilhados

**Objetivo:** Definir os contratos TypeScript usados em toda a aplicação.

**Descrição:**

- Criar `api/src/types/level.ts` com `Level` e `LEVELS`
- Criar `api/src/types/conversation.ts` com tipos derivados do schema Drizzle
- Criar `api/src/types/message.ts` com `Message`, `MessageRole` e tipos de `parts`/`metadata`
- Definir helpers para converter mensagens do banco para `UIMessage`/model messages

**Dependências:** Tarefa 1.1

**Critérios de Aceite:**

- Tipos exportados sem `any`
- Tipos derivados do schema Drizzle (`InferSelectModel`) onde fizer sentido
- Conversão entre DB message e formato AI SDK fica centralizada
- TypeScript compila sem erros

**Complexidade:** Baixa

---

### Fase 2 — Integração com LLM

---

#### Tarefa 2.1 — Cliente OpenRouter com Provider Oficial

**Objetivo:** Configurar o provider de LLM com `@openrouter/ai-sdk-provider`.

**Descrição:**

- Criar `api/src/lib/ai/config.ts` com:
  - `DEFAULT_MODEL = "google/gemma-4-31b-it:free"`
  - parâmetros default de geração
- Criar `api/src/lib/ai/client.ts` usando `createOpenRouter`
- Ler `OPENROUTER_API_KEY` exclusivamente do ambiente do servidor
- Exportar `getChatModel(modelId?: string)`

**Dependências:** Tarefa 1.1

**Critérios de Aceite:**

- `getChatModel()` retorna uma instância válida do provider
- Trocar o modelo requer alterar apenas `config.ts`
- Sem credenciais hardcoded
- `OPENROUTER_API_KEY` ausente gera erro descritivo
- Não usar `@ai-sdk/openai` com `baseURL` para OpenRouter

**Complexidade:** Baixa

---

#### Tarefa 2.2 — Rota de Chat com Streaming em `/api/chat`

**Objetivo:** Implementar o endpoint `POST /api/chat` no servidor Express.

**Descrição:**

- Criar `api/src/controllers/chatController.ts`
- Criar `api/src/schemas/chat.schema.ts`
- Aceitar body com:
  - `conversationId`
  - nova mensagem do usuário em formato compatível com AI SDK UI
- Rejeitar payloads que incluam campos de histórico (`messages`) enviados pelo cliente
- Ignorar qualquer histórico vindo do cliente para montar contexto
- Chamar `chatService.streamResponse(conversationId, message, res)`, que:
  - Busca a conversation no DB para obter `level` e `model`
  - Carrega histórico salvo no DB
  - Carrega system prompt via `loadPrompt(level)`
  - Persiste a nova mensagem do usuário
  - Chama `streamText`
  - Transmite usando as APIs atuais de UI stream do AI SDK para Express
  - Persiste resposta do assistente com `content`, `parts` e `metadata` ao finalizar
- Criar `api/src/routes/chatRoutes.ts`
- Registrar em `api/src/routes/routes.ts` como `router.use('/chat', chatRouter)`

**Dependências:** Tarefa 2.1, Tarefa 1.3, Tarefa 3.1, Tarefa 3.2

**Critérios de Aceite:**

- Endpoint final acessível em `POST /api/chat`
- Streaming funciona no frontend com `useChat`
- Mensagem do usuário é salva antes da chamada ao LLM
- Mensagem do assistente é salva após o stream completar
- Histórico usado pelo LLM vem do banco, não do cliente
- Payload com histórico completo do frontend retorna 400
- `conversationId` inexistente retorna 404
- Payload inválido retorna 400
- Erros antes do início do stream retornam JSON com status adequado

**Complexidade:** Média

---

### Fase 3 — Persistência

---

#### Tarefa 3.1 — Service de Conversas

**Objetivo:** Implementar as operações de banco de dados para conversas.

**Descrição:**

- Criar `api/src/services/conversationService.ts` com:
  - `createConversation(data: { level: Level; metadata?: Record<string, unknown> })`
  - `listConversations()`
  - `getConversation(id: string)`
  - `deleteConversation(id: string)`
- `createConversation` deve:
  - Usar UUID gerado pelo Postgres/Drizzle
  - Obter o próximo `seq` da sequence do Postgres no início da transação
  - Usar `DEFAULT_MODEL`
  - Gerar `title = "Conversa {id-incremental} - dd/mm - HH:mm"`, usando `seq` como `id-incremental`
  - Salvar `metadata` com default `{}`
  - Inserir a conversa já com `seq` e `title` finais, sem título vazio ou provisório

**Dependências:** Tarefa 1.2, Tarefa 1.4, Tarefa 2.1

**Critérios de Aceite:**

- Título gerado no formato `"Conversa {id-incremental} - dd/mm - HH:mm"`; exemplo: `"Conversa 1 - 28/05 - 20:08"`
- Nenhuma conversa é inserida com título vazio ou provisório
- `seq` é gerado pelo banco e é único
- `getConversation` inclui mensagens ordenadas por `created_at ASC`
- `deleteConversation` remove mensagens por cascade
- Queries Drizzle tipadas

**Complexidade:** Baixa

---

#### Tarefa 3.2 — Service de Mensagens e Streaming

**Objetivo:** Implementar persistência de mensagens e orquestração do streaming.

**Descrição:**

- Criar `api/src/services/chatService.ts` com:
  - `saveMessage(data: { conversationId; role; content; parts; metadata })`
  - `streamResponse(conversationId, userMessage, res)`
- `saveMessage` deve:
  - Persistir `content`, `parts`, `metadata`
  - Atualizar `updated_at` da conversa pai em transação
- `streamResponse` deve:
  - Buscar conversation e histórico do banco
  - Persistir a nova mensagem do usuário
  - Montar mensagens do modelo a partir do system prompt + histórico salvo
  - Chamar `streamText`
  - Fazer pipe do stream para o response Express
  - Persistir resposta final do assistente

**Dependências:** Tarefa 1.2, Tarefa 1.4, Tarefa 2.1

**Critérios de Aceite:**

- Toda mensagem aceita pelo backend é persistida
- `updated_at` da conversa é atualizado a cada mensagem salva
- `parts` preserva formato compatível com AI SDK UI
- `metadata` é persistido para user e assistant
- Backend não usa histórico vindo do frontend como fonte de verdade

**Complexidade:** Média

---

#### Tarefa 3.3 — API REST de Conversas em `/api/conversations`

**Objetivo:** Expor endpoints HTTP para gerenciar conversas.

**Descrição:**

- Criar `api/src/controllers/conversationController.ts`
- Criar `api/src/schemas/conversation.schema.ts`
- Criar `api/src/routes/conversationRoutes.ts`
- Registrar em `api/src/routes/routes.ts` como `router.use('/conversations', conversationRouter)`
- Endpoints:
  - `GET /api/conversations`
  - `POST /api/conversations`
  - `GET /api/conversations/:id`
  - `DELETE /api/conversations/:id`

**Dependências:** Tarefa 3.1

**Critérios de Aceite:**

- `POST /api/conversations` com `level` inválido retorna 400
- `GET /api/conversations/:id` inexistente retorna 404
- Respostas JSON tipadas
- Controllers delegam regras aos services
- Rotas usam o prefixo `/api`

**Complexidade:** Baixa

---

### Fase 4 — Interface do Usuário

---

#### Tarefa 4.1 — Página de Onboarding

**Objetivo:** Implementar a tela inicial onde o usuário escolhe seu nível de inglês e inicia uma conversa.

**Descrição:**

- Criar `web/src/lib/api.ts` com cliente tipado para `NEXT_PUBLIC_API_URL`
- Criar `web/src/components/onboarding/LevelSelector.tsx`
- Exibir os 6 níveis CEFR
- Ler e salvar `preferredLevel` no `localStorage`
- Ao confirmar, chamar `POST /api/conversations`
- Redirecionar para `/chat/[id]`
- Criar `web/src/app/onboarding/page.tsx`
- Modificar `web/src/app/page.tsx` para redirecionar para `/onboarding`

**Dependências:** Tarefa 3.3

**Critérios de Aceite:**

- Todos os 6 níveis são exibidos
- Nível anteriormente usado é pré-selecionado
- Seleção cria conversa via `/api/conversations`
- Estado de loading durante criação
- Layout responsivo

**Complexidade:** Baixa

---

#### Tarefa 4.2 — Interface de Chat com AI SDK Atual

**Objetivo:** Implementar a tela de conversa com streaming de respostas em tempo real.

**Descrição:**

- Criar `web/src/components/chat/MessageList.tsx`
- Criar `web/src/components/chat/MessageInput.tsx`
- Criar `web/src/components/chat/ChatInterface.tsx`
- Usar `useChat` de `@ai-sdk/react`
- Usar APIs atuais do AI SDK, incluindo transport quando necessário
- Configurar `DefaultChatTransport` com `prepareSendMessagesRequest` ou transport customizado equivalente
- Enviar para `${NEXT_PUBLIC_API_URL}/api/chat`
- Enviar apenas a nova mensagem do usuário e `conversationId`
- Inicializar a UI com mensagens vindas de `GET /api/conversations/:id`
- Desabilitar input quando `status` estiver `submitted` ou `streaming`
- Criar `web/src/app/chat/[id]/page.tsx`

**Dependências:** Tarefa 2.2, Tarefa 3.3, Tarefa 4.1

**Critérios de Aceite:**

- Tokens aparecem em tempo real
- Histórico salvo é exibido ao abrir conversa existente
- Nova mensagem aparece imediatamente na UI
- Input desabilita durante geração
- Erro de rede exibe feedback ao usuário
- O frontend não envia histórico completo como fonte de verdade
- O payload enviado ao backend não contém o histórico completo como campo `messages`

**Complexidade:** Média

---

#### Tarefa 4.3 — Sidebar de Conversas

**Objetivo:** Permitir ao usuário navegar entre conversas anteriores e criar novas.

**Descrição:**

- Criar `web/src/components/chat/ConversationSidebar.tsx`
- Criar `web/src/app/chat/layout.tsx`
- Buscar conversas via `GET /api/conversations`
- Exibir título e nível
- Botão "Nova Conversa" navega para `/onboarding`
- Destacar conversa ativa

**Dependências:** Tarefa 3.3, Tarefa 4.2

**Critérios de Aceite:**

- Lista exibe títulos no formato definido
- Conversa ativa visualmente destacada
- Sidebar usável em telas pequenas
- Lista reflete conversas criadas recentemente após navegação/refresh

**Complexidade:** Baixa

---

### Fase 5 — Qualidade

---

#### Tarefa 5.1 — Testes de Integração dos Services com `node:test`

**Objetivo:** Garantir corretude das operações de banco dos services usando Postgres de teste.

**Descrição:**

- Usar `node:test`, seguindo o padrão existente do `api/`
- Testar `conversationService.ts` e `chatService.ts`
- Usar Postgres de teste via `TEST_DATABASE_URL`
- Reaproveitar helpers de integração existentes quando fizer sentido
- Nomear os arquivos como `*.integration.spec.ts` se dependerem do banco real
- Atualizar o helper `resetDatabase` para truncar `messages`, `conversations` e `items` com `RESTART IDENTITY CASCADE`
- Cobrir criação, listagem, busca por ID, deleção e not-found
- Verificar formato do título
- Verificar persistência de `metadata` e `parts`

**Dependências:** Tarefa 3.1, Tarefa 3.2

**Critérios de Aceite:**

- Testes rodam com `npm run test:integration --prefix api`
- Banco de teste é limpo entre testes
- Nenhum teste usa SQLite em memória
- Cobre caminhos felizes e casos de erro

**Complexidade:** Média

---

#### Tarefa 5.2 — Testes Unitários do Loader de Prompts

**Objetivo:** Garantir que o carregamento dinâmico de prompts funciona corretamente.

**Descrição:**

- Criar testes para `api/src/lib/prompts/loader.ts`
- Usar `node:test`
- Mockar leitura de arquivos quando adequado
- Testar níveis válidos e inválidos
- Testar retorno de string vazia para arquivos ainda não definidos

**Dependências:** Tarefa 1.3

**Critérios de Aceite:**

- Cobre todos os 6 níveis válidos
- Cobre pelo menos 1 caso inválido
- Arquivos vazios são aceitos

**Complexidade:** Baixa

---

#### Tarefa 5.3 — Testes de Integração HTTP com `supertest`

**Objetivo:** Validar os endpoints novos de conversas e chat.

**Descrição:**

- Criar testes de rota com `supertest`
- Cobrir:
  - `POST /api/conversations`
  - `GET /api/conversations`
  - `GET /api/conversations/:id`
  - `DELETE /api/conversations/:id`
  - validação básica de `POST /api/chat`
- Mockar a chamada ao LLM/streaming quando necessário para evitar dependência externa
- Usar Postgres de teste via `TEST_DATABASE_URL`

**Dependências:** Tarefa 2.2, Tarefa 3.3

**Critérios de Aceite:**

- Rotas usam prefixo `/api`
- Casos 400 e 404 cobertos
- Testes não chamam OpenRouter real
- Testes passam com o setup atual de `node:test` + `supertest`

**Complexidade:** Média

---

#### Tarefa 5.4 — Variáveis de Ambiente e Documentação

**Objetivo:** Documentar como configurar e rodar o projeto.

**Descrição:**

- Atualizar `api/.env.example` com `OPENROUTER_API_KEY`
- Criar/atualizar `web/.env.local.example` com `NEXT_PUBLIC_API_URL`
- Atualizar `README.md` raiz com:
  - Pré-requisitos
  - Como rodar Postgres local
  - Como rodar `api/` e `web/`
  - Como configurar OpenRouter
  - Como trocar o modelo LLM
  - Como rodar testes

**Dependências:** Todas as tarefas anteriores

**Critérios de Aceite:**

- Desenvolvedor consegue rodar o projeto completo seguindo o README
- Todas as variáveis de ambiente estão documentadas
- README menciona Postgres, não SQLite

**Complexidade:** Baixa

---

## 4. Resumo das Fases

| Fase | Tarefas | Complexidade Total |
|---|---|---|
| 1 — Fundação | 1.1, 1.2, 1.3, 1.4 | Baixa |
| 2 — Integração LLM | 2.1, 2.2 | Baixa + Média |
| 3 — Persistência | 3.1, 3.2, 3.3 | Baixa + Média + Baixa |
| 4 — Interface | 4.1, 4.2, 4.3 | Baixa + Média + Baixa |
| 5 — Qualidade | 5.1, 5.2, 5.3, 5.4 | Média + Baixa + Média + Baixa |

**Ordem de implementação recomendada:**

1. 1.1
2. 1.4
3. 1.2
4. 1.3
5. 2.1
6. 3.1
7. 3.2
8. 3.3
9. 2.2
10. 4.1
11. 4.2
12. 4.3
13. 5.1
14. 5.2
15. 5.3
16. 5.4

> A tarefa 2.2 depende dos services de persistência para garantir que toda mensagem aceita pelo backend seja salva. As demais tarefas podem ser paralelizadas quando não compartilharem arquivos.

---

*Aguardando aprovação antes de iniciar qualquer implementação.*
