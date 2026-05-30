import type { Level } from '../../types/level.js'
import { CORRECTION_MARKER_PATTERN, LEVEL_CRITERIA, QUESTION_PATTERN, REASONING_PATTERNS } from './criteria.js'

export interface EvaluationResult {
  passed: boolean
  wordCount: number
  correctionCount: number
  hasFinalQuestion: boolean
  noReasoningExposed: boolean
  withinWordBudget: boolean
  withinCorrectionLimit: boolean
  violations: string[]
}

/**
 * Evaluates a tutor response against the pedagogical criteria for a given CEFR level.
 *
 * Checks performed:
 * - Word count is within the level's budget
 * - Number of correction markers does not exceed the level's limit
 * - Response contains a question to encourage the learner to write more
 * - Response does not expose the model's internal reasoning process
 *
 * Does NOT make any network calls — suitable for offline CI use.
 */
export function evaluate(response: string, level: Level): EvaluationResult {
  const criteria = LEVEL_CRITERIA[level]
  const violations: string[] = []

  const wordCount = response.trim().split(/\s+/).filter(Boolean).length

  const correctionMatches = response.match(CORRECTION_MARKER_PATTERN)
  const correctionCount = correctionMatches?.length ?? 0

  const hasFinalQuestion = QUESTION_PATTERN.test(response)
  const noReasoningExposed = !REASONING_PATTERNS.some(pattern => pattern.test(response))

  const withinWordBudget = wordCount <= criteria.maxWords
  const withinCorrectionLimit = correctionCount <= criteria.maxCorrections

  if (!withinWordBudget) {
    violations.push(`Word count ${wordCount} exceeds budget of ${criteria.maxWords} for level ${level}`)
  }

  if (!withinCorrectionLimit) {
    violations.push(
      `Correction count ${correctionCount} exceeds limit of ${criteria.maxCorrections} for level ${level}`,
    )
  }

  if (!hasFinalQuestion) {
    violations.push('Response does not contain a final question to encourage continued writing')
  }

  if (!noReasoningExposed) {
    violations.push('Response exposes internal reasoning process')
  }

  return {
    passed: violations.length === 0,
    wordCount,
    correctionCount,
    hasFinalQuestion,
    noReasoningExposed,
    withinWordBudget,
    withinCorrectionLimit,
    violations,
  }
}
