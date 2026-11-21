import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildCsv, deduplicateCards } from './reviewService.js'

test('deduplicateCards removes duplicates ignoring case and surrounding spaces', () => {
  const result = deduplicateCards([
    { front: ' I has a cat ', back: 'I have a cat', tags: ['grammar'] },
    { front: 'i has a cat', back: 'Duplicate', tags: ['grammar'] },
    { front: '   ', back: 'Empty front ignored', tags: [] },
    { front: 'Take off', back: 'Decolar', tags: ['phrasal-verbs'] },
  ])

  assert.deepStrictEqual(result, [
    { front: ' I has a cat ', back: 'I have a cat', tags: ['grammar'] },
    { front: 'Take off', back: 'Decolar', tags: ['phrasal-verbs'] },
  ])
})

test('buildCsv formats Anki header and escapes semicolons and quotes', () => {
  const csv = buildCsv([
    {
      front: 'Use "have"; not "has"',
      back: '<b>I have</b> a dog',
      tags: ['grammar', 'A1'],
    },
  ])

  assert.strictEqual(
    csv,
    [
      '#separator:semicolon',
      '#html:true',
      '#deck:English Coach - Revisão',
      '#notetype:Basic',
      '"Use ""have""; not ""has""";<b>I have</b> a dog;grammar A1',
    ].join('\n'),
  )
})
