# Tarefa 6 — System Prompts compostos com Perfil de Agente

## Contexto

O ia-chat-teacher usa system prompts por nível CEFR (A1–C2) para adaptar o comportamento do tutor
de escrita em inglês. Até agora os arquivos de prompt eram monolíticos e vazios.

A partir desta tarefa o sistema passa a suportar **perfis de agente** escolhidos pelo usuário,
onde cada perfil define uma persona e tom diferentes para o tutor. Os system prompts passam a ser
**compostos em tempo de execução** a partir de três camadas independentes:

```
[shared/core.md]     — identidade base, regras de idioma, abordagem pedagógica, segurança
[profiles/{perfil}.md] — persona, tom e estilo do agente para o perfil escolhido
[levels/{nivel}.md]  — vocabulário-alvo, gramática, intensidade de correção e exemplos few-shot
```

## Perfis disponíveis

| Identificador  | Persona                                                         |
|----------------|-----------------------------------------------------------------|
| `professor`    | Professora estruturada, paciente e encorajadora                 |
| `bestfriend`   | Melhor amigo(a) nativo(a), casual e descontraído(a)             |
| `secretary`    | Secretária profissional, precisa e formal                       |
| `girlfriend`   | Namorada carinhosa e pessoal, corrige com gentileza             |

## Regras de composição

- O `core.md` é **idêntico** para todos os perfis e níveis (estável para caching de prefixo).
- O arquivo de perfil define **somente** o que muda por persona — não repete regras do core.
- O arquivo de nível define **somente** o que muda por nível CEFR — não repete regras do core.
- O system prompt final = conteúdo de `core.md` + conteúdo de `profiles/{perfil}.md` + conteúdo de `levels/{nivel}.md`, separados por uma linha em branco.
- Nenhum dado dinâmico (nome do usuário, data, estatísticas) vai no system prompt.

## O que foi implementado

- [x] Estrutura de arquivos `api/prompts/shared/`, `api/prompts/profiles/`, `api/prompts/levels/`
- [x] Conteúdo completo de `shared/core.md`, dos 4 perfis e dos 6 níveis (A1–C2)
- [x] `api/src/types/profile.ts` — tipo `Profile` e validação `isValidProfile`
- [x] Migration de banco de dados adicionando coluna `profile` à tabela `conversations`
- [x] `api/src/database/schema.ts` atualizado com a coluna `profile` e check constraint
- [x] `api/src/types/conversation.ts` e `conversation.schema.ts` atualizados com o campo `profile`
- [x] `conversationService.ts` passa `profile` ao criar conversa
- [x] `conversationController.ts` passa `profile` do body ao service
- [x] `loader.ts` compõe o prompt a partir das três camadas
- [x] `chatService.ts` passa `profile` ao `loadPrompt`
- [x] Testes do loader atualizados

## Próximos passos (fora do escopo desta tarefa)

- Expor `profile` na UI de onboarding para o usuário escolher
- Adicionar testes de integração específicos para perfis
- Evoluir o conteúdo dos prompts com base em testes e feedback
