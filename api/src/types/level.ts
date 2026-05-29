export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export type Level = (typeof LEVELS)[number]

export function isValidLevel(value: unknown): value is Level {
  return LEVELS.includes(value as Level)
}
