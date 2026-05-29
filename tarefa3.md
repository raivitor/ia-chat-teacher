# Objetivo

Após analisar o conteúdo atual do `PROMPT_DESIGN_GUIDE.md`, percebi que ele mistura dois tipos de conhecimento:

1. Diretrizes para criação de System Prompts.
2. Decisões técnicas e arquiteturais do sistema.

Quero separar esses assuntos para que cada documento tenha uma responsabilidade clara.

---

# Tarefa

Revise completamente o conteúdo atual do `PROMPT_DESIGN_GUIDE.md`.

Identifique quais seções realmente ajudam na criação, manutenção e revisão dos System Prompts e quais seções são relacionadas à arquitetura, infraestrutura, performance, integrações ou evolução da plataforma.

A partir dessa análise:

1. Refatore o `PROMPT_DESIGN_GUIDE.md`, removendo todo conteúdo que não seja diretamente relevante para a criação dos System Prompts.
2. Preserve apenas o conhecimento necessário para um prompt engineer criar, revisar e evoluir os prompts dos níveis A1–C2.
3. Extraia o conteúdo técnico para novos documentos especializados.
4. Nenhum conhecimento deve ser descartado.
5. Se necessário, crie mais de um documento novo em vez de concentrar tudo em um único arquivo.

---

# Responsabilidade de Cada Documento

## PROMPT_DESIGN_GUIDE.md

Este documento deve responder exclusivamente perguntas como:

* Como estruturar um bom System Prompt?
* Como adaptar o comportamento para cada nível de inglês?
* Como usar Few-Shot Examples?
* Como aplicar Consistency?
* Como definir regras pedagógicas?
* Como organizar templates?
* Como revisar prompts?
* Como evitar anti-padrões?
* Como evoluir prompts ao longo do tempo?

O leitor deste documento deve conseguir criar ou modificar prompts sem precisar conhecer detalhes técnicos da plataforma.

---

## Documentação Técnica

O conteúdo técnico extraído deve conter assuntos como:

* DeepSeek-V4-Flash
* OpenRouter
* Prompt Caching
* Context Caching
* Reasoning Tokens
* Latência
* Custos
* Performance
* Uptime
* Estratégias de roteamento
* Arquitetura do sistema
* Persistência
* Observabilidade
* Evolução futura da plataforma

O objetivo é servir como referência para desenvolvimento e evolução do sistema.

---

# Estrutura Esperada

Avalie a necessidade de criar documentos como:

```text
PROMPT_DESIGN_GUIDE.md
TECHNICAL_ARCHITECTURE.md
LLM_OPERATIONS_GUIDE.md
PROMPT_OPTIMIZATION_GUIDE.md
```

Esses nomes são apenas sugestões.

Crie a estrutura que considerar mais adequada.

---

# Resultado Esperado

Ao final da tarefa:

* `PROMPT_DESIGN_GUIDE.md` deve ficar significativamente mais enxuto.
* Cada documento deve possuir uma responsabilidade única e bem definida.
* Não deve existir duplicação desnecessária entre documentos.
* Nenhum conhecimento relevante deve ser perdido.
* Deve ficar claro para futuros agentes qual documento consultar para cada tipo de dúvida.

Antes de modificar os arquivos, apresente a proposta de reorganização da documentação e justifique a distribuição do conteúdo entre os documentos.
