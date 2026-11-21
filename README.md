# English Writing Coach

Aplicação web full-stack para prática pessoal de escrita em inglês via conversação com IA. O assistente adapta vocabulário, tamanho de resposta e correções ao nível CEFR selecionado (`A1`–`C2`) e à persona escolhida, usa streaming de respostas, busca opcional na web e exporta flashcards para revisão no Anki.

Stack: **Next.js 16 + React 19** (`web/`) e **Express 5 + TypeScript + Drizzle + Postgres 18** (`api/`), com o [Vercel AI SDK](https://sdk.vercel.ai/), [OpenRouter](https://openrouter.ai/) e [Tavily](https://tavily.com/) (busca na web opcional).

## Pré-requisitos

Ambiente suportado: **Linux Mint** (ou **Windows via WSL2**).

- Node 24+
- npm 11+
- Docker (para Postgres local) **ou** uma instância Postgres acessível

## Setup inicial

```bash
# Copiar variáveis de ambiente
cp api/.env.example api/.env
cp web/.env.example web/.env.local

# Instalar dependências
npm ci --prefix api
npm ci --prefix web
```

Edite `api/.env`:
- `OPENROUTER_API_KEY`: sua chave do OpenRouter (obrigatória).
- `TAVILY_API_KEY`: sua chave do Tavily (opcional, necessária apenas para conversas com **Busca na Web** ativada).

Edite `web/.env.local` e ajuste `NEXT_PUBLIC_API_URL` se necessário (padrão: `http://localhost:3001`).

## Postgres local com Docker

```bash
docker compose -f api/docker-compose.yml up -d
npm run db:migrate --prefix api
```

## Desenvolvimento

```bash
npm run dev --prefix api   # API em http://localhost:3001
npm run dev --prefix web   # Web em http://localhost:3000
```

Ou ambos juntos na raiz:

```bash
npm run run:all
```

Acesse `http://localhost:3000` — você será redirecionado para a tela de onboarding em português.

## Funcionalidades principais

- **Onboarding configurável por conversa:** escolha nível CEFR (`A1`–`C2`), persona (**Professora Aria**, **Melhor Amigo Jamie**, **Secretária Claire** ou **Namorada Lily**), modelo gratuito de IA e se deseja habilitar **Busca na Web**. As configurações ficam fixas na conversa criada e o usuário inicia o assunto.
- **Chat em streaming:** respostas em inglês com destaque visual para dicas/correções, fontes clicáveis quando a busca web é utilizada, botão **Parar**, botão **Tentar novamente** em caso de erro e barra de uso da janela de contexto.
- **Finalização e revisão para o Anki:** clique em **Finalizar conversa** no cabeçalho do chat quando encerrar a prática. Conversas finalizadas (com pelo menos 1 mensagem) entram na fila **Gerar revisão (N)** da barra lateral, que extrai flashcards via IA e faz o download direto do arquivo `anki-review.txt` pronto para importar no Anki. Caso queira continuar uma conversa finalizada, use **Reabrir conversa**.

## Configuração do OpenRouter

1. Crie uma conta em [openrouter.ai](https://openrouter.ai/)
2. Gere uma API key em **Settings → Keys**
3. Defina `OPENROUTER_API_KEY=sua-chave` em `api/.env`

## Estratégia LLM

O backend usa exclusivamente modelos gratuitos do OpenRouter via Vercel AI SDK:

- **1ª opção (padrão):** `google/gemma-4-31b-it:free` (Gemma 4 31B — modelo denso `instruction-tuned`, 262K de contexto)
- **2ª opção (fallback):** `google/gemma-4-26b-a4b-it:free` (Gemma 4 26B A4B — MoE mais rápido, 262K de contexto)

Configurações aplicadas no roteamento:

- roteamento por menor latência (`provider.sort = "latency"`) com `allow_fallbacks = true`;
- `session_id` por conversa para favorecer cache contextual;
- reasoning desativado no chat normal (`effort = "none"`);
- janela deslizante de histórico (`MAX_HISTORY_MESSAGES = 40`) e cancelamento automático via `abortSignal` se a requisição for interrompida;
- avaliação pedagógica assíncrona nos metadados/logs (`evaluator.ts`) e *usage accounting* habilitado.

O endpoint `GET /api/models` expõe `models`, `defaultModel`, `fallbackModel`, `productionRecommendedModel` e `contextWindow` para o frontend.

## Testes e Qualidade

```bash
# Validação completa (lint + typecheck + testes unitários em api e web)
npm run ci:simulate

# Formatação (api e web)
npm run format:all

# Testes unitários da API
npm run test:unit --prefix api

# Testes de integração da API (requer Postgres de teste via TEST_DATABASE_URL em api/.env)
npm run test:integration --prefix api

# Testes unitários do frontend
npm run test:unit --prefix web
```

Os testes de integração usam `TEST_DATABASE_URL` (definida em `api/.env`) e **não** funcionam com SQLite.
