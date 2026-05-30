import type { Level } from '../../types/level.js'

export interface LevelCriteria {
  maxCorrections: number
  maxWords: number
}

export const LEVEL_CRITERIA: Record<Level, LevelCriteria> = {
  A1: { maxCorrections: 1, maxWords: 45 },
  A2: { maxCorrections: 2, maxWords: 65 },
  B1: { maxCorrections: 2, maxWords: 90 },
  B2: { maxCorrections: 3, maxWords: 120 },
  C1: { maxCorrections: 3, maxWords: 150 },
  C2: { maxCorrections: 4, maxWords: 180 },
}

/**
 * Matches correction markers used across all CEFR levels:
 * - "(Small tip: ...)" — A1 through B2
 * - "(One note: ...)"  — C1 and C2
 */
export const CORRECTION_MARKER_PATTERN = /\((Small tip:|One note:)/g

/** Matches any sentence-ending question mark in the response. */
export const QUESTION_PATTERN = /\?/

/**
 * Patterns that indicate the model is exposing its internal reasoning
 * process rather than delivering a direct response.
 */
export const REASONING_PATTERNS: RegExp[] = [
  /\blet me think\b/i,
  /\bmy analysis\b/i,
  /\bchain of thought\b/i,
  /\bstep by step\b/i,
  /\bi(?:'m| am) thinking\b/i,
  /\bmy reasoning\b/i,
  /\blet me reason\b/i,
]
