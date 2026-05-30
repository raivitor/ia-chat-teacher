import assert from 'node:assert/strict'
import { test } from 'node:test'

import { loadPrompt } from './loader.js'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
const PROFILES = ['professor', 'bestfriend', 'secretary', 'girlfriend'] as const

test('loadPrompt rejects invalid level', async () => {
  await assert.rejects(() => loadPrompt('XX'), /Invalid CEFR level/)
})

test('loadPrompt rejects empty string level', async () => {
  await assert.rejects(() => loadPrompt(''), /Invalid CEFR level/)
})

test('loadPrompt rejects lowercase level', async () => {
  await assert.rejects(() => loadPrompt('b1'), /Invalid CEFR level/)
})

test('loadPrompt rejects invalid profile', async () => {
  await assert.rejects(() => loadPrompt('A1', 'unknown'), /Invalid profile/)
})

for (const level of LEVELS) {
  test(`loadPrompt accepts valid level ${level} with default profile and returns non-empty string`, async () => {
    const result = await loadPrompt(level)
    assert.strictEqual(typeof result, 'string')
    assert.ok(result.length > 0, 'composed prompt must not be empty')
  })
}

for (const profile of PROFILES) {
  test(`loadPrompt accepts profile ${profile} with level A1 and returns non-empty string`, async () => {
    const result = await loadPrompt('A1', profile)
    assert.strictEqual(typeof result, 'string')
    assert.ok(result.length > 0, 'composed prompt must not be empty')
  })
}

test('loadPrompt composes content from core, profile, and level parts', async () => {
  const result = await loadPrompt('B1', 'professor')
  assert.ok(result.includes('Core Language Rules'), 'must include core section')
  assert.ok(result.includes('Your Role'), 'must include profile section')
  assert.ok(result.includes('Level B1 Rules'), 'must include level section')
})
