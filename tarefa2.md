# Objetivo

Quero que você produza um guia completo para criação dos System Prompts que serão utilizados pelo meu projeto de prática de escrita em inglês.

O guia servirá como referência oficial para futuras versões dos prompts armazenados na pasta:

```text
api/prompts/
```

Esses prompts serão utilizados pelo modelo:

```text
DeepSeek-V4-Flash
```

que será o LLM principal responsável por conduzir conversas em inglês com usuários de diferentes níveis de proficiência.

---

# Contexto do Produto

Estou desenvolvendo uma aplicação para praticar escrita em inglês.

Durante o onboarding, o usuário seleciona seu nível:

* A1
* A2
* B1
* B2
* C1
* C2

Cada nível possui um System Prompt próprio.

O objetivo dos prompts é fazer com que a IA:

* converse em inglês;
* adapte vocabulário ao nível do usuário;
* adapte complexidade gramatical ao nível;
* incentive o usuário a escrever;
* corrija erros de forma apropriada;
* ajude na evolução gradual do inglês;
* mantenha uma experiência natural de conversa.

---

# Fontes de Pesquisa

Analise cuidadosamente os materiais abaixo antes de escrever o guia:

* https://www.promptingguide.ai/guides/optimizing-prompts
* https://www.promptingguide.ai/techniques/fewshot
* https://www.promptingguide.ai/techniques/cot
* https://www.promptingguide.ai/techniques/react
* https://www.promptingguide.ai/applications/context-caching
* https://openrouter.ai/docs/guides/best-practices/latency-and-performance
* https://openrouter.ai/docs/guides/best-practices/prompt-caching
* https://openrouter.ai/docs/guides/best-practices/uptime-optimization
* https://openrouter.ai/docs/guides/best-practices/reasoning-tokens
* https://api-docs.deepseek.com/news/news260424
* https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash
* DeepSeek_V4.pdf

---

# O que quero que você faça

Analise as referências e produza um documento que responda às seguintes perguntas:

1. Quais técnicas de prompting são realmente úteis para este caso de uso?
2. Quais técnicas devem ser evitadas?
3. Como estruturar um bom System Prompt para DeepSeek-V4-Flash?
4. Como reduzir custo e consumo de contexto?
5. Como aproveitar Context Caching?
6. Como manter consistência entre múltiplas conversas?
7. Como definir regras sem tornar o prompt excessivamente longo?
8. Como construir prompts fáceis de manter ao longo do tempo?
9. Como separar comportamento global de comportamento específico por nível?
10. Como criar exemplos Few-Shot eficientes para ensino de idiomas?

---

# Análise Esperada

Para cada técnica encontrada nas referências:

* explique o conceito;
* avalie se ela é adequada para este projeto;
* explique vantagens;
* explique desvantagens;
* forneça exemplos adaptados ao contexto de ensino de inglês.

Não faça apenas um resumo das fontes.

Faça uma análise crítica focada especificamente neste projeto.

---

# Estrutura Esperada do Documento

Crie um arquivo Markdown chamado:

```text
PROMPT_DESIGN_GUIDE.md
```

com a seguinte estrutura mínima:

# Introdução

# Objetivos dos System Prompts

# Características do DeepSeek-V4-Flash

# Arquitetura Recomendada dos Prompts

# Estrutura Base de um System Prompt

# Estratégias de Ensino de Inglês

# Adaptação por Nível (A1–C2)

# Uso de Few-Shot Examples

# Uso de Chain of Thought

# Uso de ReAct

# Context Caching

# Otimização de Tokens

# Boas Práticas

# Anti-Padrões

# Template Base Recomendado

# Checklist para Revisão de Prompts

# Exemplos de System Prompts

---

# Importante

* O foco principal deve ser DeepSeek-V4-Flash.
* Priorize recomendações práticas.
* Justifique cada recomendação.
* Sempre considere custo, latência, manutenção e qualidade pedagógica.
* Quando houver conflito entre uma técnica teórica e a realidade do DeepSeek-V4-Flash, priorize o que funciona melhor na prática.
* Não implemente os prompts finais dos níveis A1–C2.
* O objetivo é criar um guia que será utilizado posteriormente para construir esses prompts.
