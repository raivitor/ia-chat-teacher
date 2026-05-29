'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { api, type Level } from '../../lib/api'

const LEVELS: { value: Level; label: string; description: string }[] = [
  { value: 'A1', label: 'A1 — Beginner', description: 'You know a few basic words and phrases.' },
  {
    value: 'A2',
    label: 'A2 — Elementary',
    description: 'You can talk about familiar topics in simple terms.',
  },
  {
    value: 'B1',
    label: 'B1 — Intermediate',
    description: 'You can handle most everyday situations.',
  },
  {
    value: 'B2',
    label: 'B2 — Upper Intermediate',
    description: 'You can discuss complex topics with confidence.',
  },
  {
    value: 'C1',
    label: 'C1 — Advanced',
    description: 'You express yourself fluently and spontaneously.',
  },
  { value: 'C2', label: 'C2 — Proficient', description: 'You have mastered the language.' },
]

const LEVEL_STORAGE_KEY = 'preferredLevel'

export default function LevelSelector() {
  const router = useRouter()
  const [selected, setSelected] = useState<Level>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LEVEL_STORAGE_KEY)
      if (stored && LEVELS.some(l => l.value === stored)) return stored as Level
    }
    return 'B1'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      localStorage.setItem(LEVEL_STORAGE_KEY, selected)
      const conversation = await api.createConversation(selected)
      router.push(`/chat/${conversation.id}`)
    } catch {
      setError('Failed to start conversation. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className='level-selector'>
      <h1>English Writing Coach</h1>
      <p>Select your English level to get started:</p>
      <div className='levels'>
        {LEVELS.map(level => (
          <button
            key={level.value}
            className={`level-card ${selected === level.value ? 'selected' : ''}`}
            onClick={() => setSelected(level.value)}
            type='button'>
            <span className='level-name'>{level.label}</span>
            <span className='level-desc'>{level.description}</span>
          </button>
        ))}
      </div>
      {error && <p className='error'>{error}</p>}
      <button
        className='start-btn'
        onClick={handleStart}
        disabled={loading}
        type='button'>
        {loading ? 'Starting...' : 'Start Conversation'}
      </button>
    </div>
  )
}
