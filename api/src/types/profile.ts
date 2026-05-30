export const PROFILES = ['professor', 'bestfriend', 'secretary', 'girlfriend'] as const

export type Profile = (typeof PROFILES)[number]

export const DEFAULT_PROFILE: Profile = 'professor'

export function isValidProfile(value: unknown): value is Profile {
  return PROFILES.includes(value as Profile)
}
