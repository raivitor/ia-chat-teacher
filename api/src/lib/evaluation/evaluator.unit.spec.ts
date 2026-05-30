import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'

import { evaluate } from './evaluator.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadFixture(level: string) {
  const fixturePath = path.join(process.cwd(), 'src', 'test', 'fixtures', 'golden-conversations', `${level}.json`)
  const raw = await readFile(fixturePath, 'utf8')
  return JSON.parse(raw) as {
    level: string
    cases: Array<{
      id: string
      sampleResponse: string
    }>
  }
}

// ---------------------------------------------------------------------------
// Unit tests for evaluate() logic
// ---------------------------------------------------------------------------

test('evaluate: valid A1 response passes all criteria', () => {
  const response = 'Aww, what is your cat\'s name? (Small tip: say "I have a cat.")'
  const result = evaluate(response, 'A1')
  assert.strictEqual(result.passed, true)
  assert.strictEqual(result.correctionCount, 1)
  assert.strictEqual(result.hasFinalQuestion, true)
  assert.strictEqual(result.noReasoningExposed, true)
  assert.strictEqual(result.withinWordBudget, true)
  assert.strictEqual(result.withinCorrectionLimit, true)
})

test('evaluate: A1 response over word budget fails withinWordBudget', () => {
  // 50 words — exceeds A1 budget of 45
  const response =
    'That is amazing! Cats are wonderful companions and they bring so much joy and warmth into our daily lives every single day. ' +
    'What is her favourite food? She sounds absolutely adorable! Do you have any other pets at home that she really loves to play with?'
  const result = evaluate(response, 'A1')
  assert.ok(result.wordCount > 45, `expected > 45 words, got ${result.wordCount}`)
  assert.strictEqual(result.withinWordBudget, false)
  assert.ok(result.violations.some(v => v.includes('budget')))
})

test('evaluate: two corrections in A1 response exceeds limit', () => {
  const response =
    'I see! (Small tip: say "I have a cat.") What is her name? ' +
    '(Small tip: "beautiful" is an adjective, not an adverb.)'
  const result = evaluate(response, 'A1')
  assert.strictEqual(result.correctionCount, 2)
  assert.strictEqual(result.withinCorrectionLimit, false)
  assert.ok(result.violations.some(v => v.includes('Correction count')))
})

test('evaluate: response without a question fails hasFinalQuestion', () => {
  const response = 'That sounds really nice. Cats are great companions.'
  const result = evaluate(response, 'A1')
  assert.strictEqual(result.hasFinalQuestion, false)
  assert.strictEqual(result.passed, false)
})

test('evaluate: response exposing reasoning fails noReasoningExposed', () => {
  const response = "Let me think about this. What is your cat's name?"
  const result = evaluate(response, 'A1')
  assert.strictEqual(result.noReasoningExposed, false)
  assert.strictEqual(result.passed, false)
})

test('evaluate: "step by step" triggers reasoning violation', () => {
  const response = 'I will explain this step by step. First, the verb form. Second, the article. What do you think?'
  const result = evaluate(response, 'B1')
  assert.strictEqual(result.noReasoningExposed, false)
})

test('evaluate: C1 response using One note marker is counted correctly', () => {
  const response =
    "That's a pleasant surprise — especially given how cautious the initial projections were. " +
    'What do you think drove the better-than-expected outcome? ' +
    '(One note: "higher than expected" reads more naturally here.)'
  const result = evaluate(response, 'C1')
  assert.strictEqual(result.correctionCount, 1)
  assert.strictEqual(result.withinCorrectionLimit, true)
  assert.strictEqual(result.hasFinalQuestion, true)
})

test('evaluate: C2 allows up to 4 corrections', () => {
  const response =
    'Interesting point worth developing further. ' +
    '(One note: first issue.) (One note: second issue.) (One note: third issue.) (One note: fourth issue.) ' +
    'How would you develop this argument further?'
  const result = evaluate(response, 'C2')
  assert.strictEqual(result.correctionCount, 4)
  assert.strictEqual(result.withinCorrectionLimit, true)
  assert.strictEqual(result.passed, true)
})

test('evaluate: C2 with 5 corrections exceeds limit', () => {
  const response = '(One note: a.) (One note: b.) (One note: c.) (One note: d.) (One note: e.) How do you see this?'
  const result = evaluate(response, 'C2')
  assert.strictEqual(result.correctionCount, 5)
  assert.strictEqual(result.withinCorrectionLimit, false)
})

test('evaluate: "my reasoning" phrase triggers reasoning violation', () => {
  const response = 'My reasoning here is that the verb is wrong. What do you think?'
  const result = evaluate(response, 'B2')
  assert.strictEqual(result.noReasoningExposed, false)
})

test('evaluate: empty response fails all criteria', () => {
  const result = evaluate('', 'B1')
  assert.strictEqual(result.passed, false)
  assert.strictEqual(result.hasFinalQuestion, false)
})

// ---------------------------------------------------------------------------
// Fixture-based: sample responses from golden-conversations meet criteria
// ---------------------------------------------------------------------------

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

for (const level of LEVELS) {
  test(`golden conversations ${level}: every sampleResponse meets word budget`, async () => {
    const fixture = await loadFixture(level)
    for (const c of fixture.cases) {
      const result = evaluate(c.sampleResponse, level)
      assert.ok(result.withinWordBudget, `Case "${c.id}": word count ${result.wordCount} exceeds budget for ${level}`)
    }
  })

  test(`golden conversations ${level}: every sampleResponse has a final question`, async () => {
    const fixture = await loadFixture(level)
    for (const c of fixture.cases) {
      const result = evaluate(c.sampleResponse, level)
      assert.ok(result.hasFinalQuestion, `Case "${c.id}": missing final question`)
    }
  })

  test(`golden conversations ${level}: every sampleResponse respects correction limit`, async () => {
    const fixture = await loadFixture(level)
    for (const c of fixture.cases) {
      const result = evaluate(c.sampleResponse, level)
      assert.ok(
        result.withinCorrectionLimit,
        `Case "${c.id}": correction count ${result.correctionCount} exceeds limit for ${level}`,
      )
    }
  })

  test(`golden conversations ${level}: no sampleResponse exposes reasoning`, async () => {
    const fixture = await loadFixture(level)
    for (const c of fixture.cases) {
      const result = evaluate(c.sampleResponse, level)
      assert.ok(result.noReasoningExposed, `Case "${c.id}": reasoning exposed in response`)
    }
  })
}
