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
* https://www.promptingguide.ai/techniques/meta-prompting
* https://www.promptingguide.ai/techniques/consistency
* https://www.promptingguide.ai/techniques/knowledge
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


# O que quero que você faça

Analise as referências e produza um documento que responda às seguintes perguntas:

1.  Quais técnicas de prompting são realmente úteis para este caso de uso?
2.  Quais técnicas devem ser evitadas ou usadas com cuidado?
3.  Como estruturar um bom System Prompt para DeepSeek-V4-Flash?
4.  Como adaptar os prompts para usuários A1, A2, B1, B2, C1 e C2?
5.  Como separar instruções globais de instruções específicas por nível?
6.  Como criar prompts fáceis de manter dentro da pasta `api/prompts`?
7.  Como reduzir custo, latência e consumo de contexto?
8.  Como aproveitar Prompt Caching e Context Caching?
9.  Como manter estabilidade e uptime usando OpenRouter?
10.  Como escolher configurações de rota/modelo no OpenRouter para reduzir falhas?
11.  Como lidar com reasoning tokens sem desperdiçar orçamento?
12.  Como usar Few-Shot Examples para ensino de inglês?
13.  Como usar Chain of Thought sem expor raciocínio interno ao usuário?
14.  Como avaliar se ReAct faz sentido ou não para este projeto?
15.  Como usar Meta-Prompting para melhorar ou revisar os prompts?
16.  Como usar técnicas de Consistency para tornar as respostas mais previsíveis?
17.  Como usar Knowledge Prompting sem transformar o prompt em uma base de conhecimento gigante?
18.  Como definir regras pedagógicas para correção de escrita em inglês?
19.  Como equilibrar conversa natural, correção de erros e incentivo ao usuário?
20.  Como criar um padrão de resposta consistente para feedback linguístico?
21.  Como evitar que o modelo corrija demais e atrapalhe a conversa?
22.  Como definir limites de vocabulário, gramática e complexidade por nível?
23.  Como manter o modelo falando principalmente em inglês, mas explicando em português quando necessário?
24.  Como organizar exemplos, regras e templates para maximizar cache hit?
25.  Como versionar e evoluir os prompts com segurança ao longo do tempo?
26.  Quais métricas devem ser usadas para avaliar a qualidade dos prompts?
27.  Quais testes manuais ou automatizados devem ser criados para validar os prompts?
28.  Quais anti-padrões de prompting devem ser evitados neste projeto?
29.  Qual deve ser o template base recomendado para os System Prompts?
30.  Qual checklist deve ser usado antes de aprovar qualquer novo prompt?

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
