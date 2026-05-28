# Projeto: English Writing Coach

## Objetivo

Desenvolver uma aplicação web para praticar escrita em inglês através de conversação com IA.

O foco principal é melhorar a capacidade de escrita do usuário, adaptando o comportamento do assistente ao nível de proficiência informado durante a configuração inicial.

## Requisitos Funcionais

### Configuração Inicial

Durante o onboarding, o usuário deverá selecionar seu nível de inglês:

* A1
* A2
* B1
* B2
* C1
* C2

Cada nível possuirá um prompt específico utilizado como System Prompt da conversa.

Neste momento os prompts ainda não serão definidos.

Criar uma estrutura preparada para isso, incluindo arquivos vazios para cada nível:

```text
/prompts
  A1.md
  A2.md
  B1.md
  B2.md
  C1.md
  C2.md
```

Os arquivos devem ser carregados dinamicamente pela aplicação.

### Conversação

O usuário poderá iniciar múltiplas sessões de conversa.

Cada conversa deve:

* possuir um identificador único;
* armazenar data de criação;
* armazenar histórico completo das mensagens;
* armazenar metadados relevantes (nível selecionado, modelo utilizado, etc).

### Persistência

Toda sessão deverá ser salva para análise futura.

Objetivos da persistência:

* revisar conversas anteriores;
* analisar evolução do usuário;
* permitir futura implementação de correção de erros;
* permitir futura geração de relatórios de aprendizado.

Inicialmente a persistência pode ser baseada em arquivos locais ou SQLite, desde que seja simples e facilmente evoluível.

### Integração com LLM

Utilizar OpenRouter.

Modelo inicial:

google/gemma-4-31b-it:free

Referência:

https://openrouter.ai/google/gemma-4-31b-it:free

A implementação deve permitir trocar facilmente de modelo no futuro sem grandes alterações.

### Streaming

As respostas devem ser transmitidas via streaming para o frontend.

Avaliar utilização do Vercel AI SDK para:

* streaming de respostas;
* abstração do provider;
* suporte futuro a tools;
* facilidade de manutenção.

## Requisitos Não Funcionais

* Código organizado para desenvolvimento assistido por agentes.
* Baixo acoplamento.
* Separação clara entre UI, domínio e integração com LLM.
* Estrutura preparada para futuras funcionalidades.
* Facilidade para testes automatizados.

## Funcionalidades Futuras (não implementar agora)

* Correção automática dos erros do usuário.
* Geração de relatórios de progresso.
* Estatísticas por nível.
* Vocabulário aprendido.
* Exercícios personalizados.
* Busca na web via tools.
* Exportação das conversas.

## Tarefa

Antes de implementar qualquer código:

1. Analise os requisitos.
2. Proponha uma arquitetura detalhada.
3. Produza um documento Markdown chamado `PROJECT_PLAN.md`.
4. Divida o projeto em tarefas pequenas e independentes.
5. Cada tarefa deve possuir:
   * objetivo;
   * descrição;
   * dependências;
   * critérios de aceite;
   * estimativa de complexidade (Baixa, Média, Alta).
6. Organize as tarefas em fases.
7. Não implemente nada ainda.
8. Aguarde aprovação do plano antes de iniciar qualquer desenvolvimento.

Qualquer dúvida que tiver pause e me pergunte.
