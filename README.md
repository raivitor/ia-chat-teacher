# English Writing Coach

Aplicação web full-stack para prática de escrita em inglês via conversação com IA. O assistente adapta seu comportamento ao nível CEFR selecionado pelo usuário (A1-C2), utiliza streaming de respostas e persiste todo o histórico de conversas para análise futura.

Stack: **Next.js 16 + React 19** (`web/`) e **Express + TypeScript + Drizzle + Postgres** (`api/`), com o [Vercel AI SDK](https://sdk.vercel.ai/) e o provedor oficial do [OpenRouter](https://openrouter.ai/).

## Pré-requisitos

- Node 24
- npm 11+
- Docker (para Postgres local) **ou** uma instância Postgres acessível

## Setup inicial

```bash
# Copiar variáveis de ambiente
cp api/.env.example api/.env
cp web/.env.local.example web/.env.local

# Instalar dependências
npm ci --prefix api
npm ci --prefix web
```

Edite `api/.env` e defina `OPENROUTER_API_KEY` com sua chave do OpenRouter.  
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

Acesse `http://localhost:3000` — você será redirecionado para a tela de onboarding.

## Configuração do OpenRouter

1. Crie uma conta em [openrouter.ai](https://openrouter.ai/)
2. Gere uma API key em **Settings → Keys**
3. Defina `OPENROUTER_API_KEY=sua-chave` em `api/.env`

## Trocar o modelo LLM

Edite `api/src/lib/ai/config.ts` e altere `DEFAULT_MODEL`:

```ts
export const DEFAULT_MODEL = 'google/gemma-3-27b-it:free'
// Troque por qualquer modelo disponível no OpenRouter, ex:
// 'anthropic/claude-3-haiku'
// 'openai/gpt-4o-mini'
```

## Testes

```bash
# Testes unitários (api)
npm run test:unit --prefix api

# Testes de integração (requer Postgres de teste via TEST_DATABASE_URL em api/.env)
npm run test:integration --prefix api

# Todos os testes
npm run test:all --prefix api
```

Os testes de integração usam `TEST_DATABASE_URL` (definida em `api/.env`) e **não** funcionam com SQLite.

## Qualidade

```bash
npm run lint --prefix api
npm run typecheck --prefix api
npm run lint --prefix web
npm run typecheck --prefix web
```

