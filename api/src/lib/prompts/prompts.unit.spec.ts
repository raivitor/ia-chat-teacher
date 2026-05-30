import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

const WORD_BUDGETS: Record<(typeof LEVELS)[number], number> = {
  A1: 45,
  A2: 65,
  B1: 90,
  B2: 120,
  C1: 150,
  C2: 180,
}

const REQUIRED_SECTIONS = ['## Error Correction', '## Response Format', '## Examples']

const FORBIDDEN_PHRASES = [
  'think step by step',
  'show your reasoning',
  'chain of thought',
  'show reasoning',
  'step by step thinking',
]

async function readLevelPrompt(level: string): Promise<string> {
  const filePath = path.join(process.cwd(), 'prompts', 'levels', `${level}.md`)
  return readFile(filePath, 'utf8')
}

for (const level of LEVELS) {
  test(`prompt ${level}: file is not empty`, async () => {
    const content = await readLevelPrompt(level)
    assert.ok(content.trim().length > 0, `${level}.md must not be empty`)
  })

  test(`prompt ${level}: contains Level Rules header`, async () => {
    const content = await readLevelPrompt(level)
    assert.ok(content.includes(`## Level ${level} Rules`), `${level}.md must contain "## Level ${level} Rules"`)
  })

  test(`prompt ${level}: contains required sections`, async () => {
    const content = await readLevelPrompt(level)
    for (const section of REQUIRED_SECTIONS) {
      assert.ok(content.includes(section), `${level}.md must contain section "${section}"`)
    }
  })

  test(`prompt ${level}: does not contain forbidden chain-of-thought phrases`, async () => {
    const content = await readLevelPrompt(level)
    const contentLower = content.toLowerCase()
    for (const phrase of FORBIDDEN_PHRASES) {
      assert.ok(!contentLower.includes(phrase), `${level}.md must not contain "${phrase}"`)
    }
  })

  test(`prompt ${level}: Response Format declares the correct word budget`, async () => {
    const content = await readLevelPrompt(level)
    const match = /Maximum response length:\s*(\d+)\s*words/.exec(content)
    assert.ok(match !== null, `${level}.md must declare "Maximum response length: N words"`)
    const stated = Number(match[1])
    const expected = WORD_BUDGETS[level]
    assert.strictEqual(stated, expected, `${level}.md budget: expected ${expected}, got ${stated}`)
  })
}
