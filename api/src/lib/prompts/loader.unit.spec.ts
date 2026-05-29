import assert from 'node:assert/strict'
import { test } from 'node:test'

import { loadPrompt } from './loader.js'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

test('loadPrompt rejects invalid level', async () => {
  await assert.rejects(() => loadPrompt('XX'), /Invalid CEFR level/)
})

test('loadPrompt rejects empty string level', async () => {
  await assert.rejects(() => loadPrompt(''), /Invalid CEFR level/)
})

test('loadPrompt rejects lowercase level', async () => {
  await assert.rejects(() => loadPrompt('b1'), /Invalid CEFR level/)
})

for (const level of LEVELS) {
  test(`loadPrompt accepts valid level ${level} and returns string`, async () => {
    // Real prompt files exist (and are empty), so this reads from disk
    const result = await loadPrompt(level)
    assert.strictEqual(typeof result, 'string')
  })
}

test('loadPrompt returns empty string for empty prompt files', async () => {
  // A1.md exists and is empty
  const result = await loadPrompt('A1')
  assert.strictEqual(result, '')
})
