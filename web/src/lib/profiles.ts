import type { Profile } from './api'

export interface ProfileMetadata {
  name: string
  label: string
  description: string
}

export const PROFILE_META: Record<Profile, ProfileMetadata> = {
  professor: {
    name: 'Aria',
    label: 'Professora (Aria)',
    description: 'Aulas estruturadas com explicações claras.',
  },
  bestfriend: {
    name: 'Jamie',
    label: 'Melhor Amigo (Jamie)',
    description: 'Descontraído e divertido, como conversar com um amigo.',
  },
  secretary: {
    name: 'Claire',
    label: 'Secretária (Claire)',
    description: 'Profissional e precisa, com foco em inglês corporativo.',
  },
  girlfriend: {
    name: 'Lily',
    label: 'Namorada (Lily)',
    description: 'Carinhosa e encorajadora, com tom pessoal.',
  },
}

export const CONVERSATIONS_CHANGED_EVENT = 'conversations:changed'

export function notifyConversationsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CONVERSATIONS_CHANGED_EVENT))
  }
}
