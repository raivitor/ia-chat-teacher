# Ai Chat Teacher API

API em `Express 5 + TypeScript + Drizzle + Postgres 18`, com:

- healthcheck em `/healthcheck` e `/api/healthcheck`
- conversas em `/api/conversations` (listar, criar, detalhar, finalizar `/:id/finish`, reabrir `/:id/reopen` e apagar)
- chat com streaming e busca web opcional em `/api/chat`
- modelos disponíveis em `/api/models`
- fila e geração de revisão Anki em `/api/review` (`/unreviewed-count` e `/generate`)
- validação com `zod` e avaliação pedagógica offline (`src/lib/evaluation/`)
- testes unitários e de integração com `node:test` e `supertest`

## Scripts

- `npm run dev`: sobe a API em modo watch
- `npm run build`: compila para `dist`
- `npm test`: executa testes unitários
- `npm run test:integration`: executa integrações HTTP com banco real
- `npm run test:all`: executa unitários + integração
- `npm run validate`: roda lint, typecheck e testes unitários

## Banco de dados

1. Copie `api/.env.example` para `api/.env`.
2. Configure `DATABASE_URL`, `OPENROUTER_API_KEY` e (opcionalmente) `TAVILY_API_KEY`.
3. Configure `TEST_DATABASE_URL` apontando para um banco de testes dedicado.
4. Rode `npm run db:migrate`.

Para desenvolvimento local, o `docker-compose.yml` sobe um Postgres 18 configurado para a `DATABASE_URL`.
