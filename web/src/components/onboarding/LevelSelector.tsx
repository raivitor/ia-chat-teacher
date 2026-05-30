'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import { api, type Level, type Profile, type AIModel } from '../../lib/api'

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

const PROFILES: { value: Profile; label: string; description: string }[] = [
  { value: 'professor', label: 'Professor', description: 'Structured lessons with clear explanations.' },
  { value: 'bestfriend', label: 'Best Friend', description: 'Casual and playful, like texting a friend.' },
  { value: 'secretary', label: 'Secretary', description: 'Professional and precise, business-focused.' },
  { value: 'girlfriend', label: 'Girlfriend', description: 'Warm and encouraging, personal touch.' },
]

const LEVEL_STORAGE_KEY = 'preferredLevel'
const PROFILE_STORAGE_KEY = 'preferredProfile'

export default function LevelSelector() {
  const router = useRouter()
  const [selected, setSelected] = useState<Level>('B1')
  const [selectedProfile, setSelectedProfile] = useState<Profile>('professor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [models, setModels] = useState<AIModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')

  /* eslint-disable react-hooks/set-state-in-effect */
  // Intentional: reads localStorage once after mount to avoid SSR hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem(LEVEL_STORAGE_KEY)
    if (stored && LEVELS.some(l => l.value === stored)) setSelected(stored as Level)

    const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (storedProfile && PROFILES.some(p => p.value === storedProfile)) setSelectedProfile(storedProfile as Profile)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    api
      .getModels()
      .then(({ models, defaultModel }) => {
        setModels(models)
        setSelectedModel(defaultModel)
      })
      .catch(console.error)
  }, [])

  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      localStorage.setItem(LEVEL_STORAGE_KEY, selected)
      localStorage.setItem(PROFILE_STORAGE_KEY, selectedProfile)
      const conversation = await api.createConversation(selected, selectedModel || undefined, selectedProfile)
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

      <p style={{ marginTop: '24px', marginBottom: '10px' }}>Choose your conversation style:</p>
      <div className='levels'>
        {PROFILES.map(profile => (
          <button
            key={profile.value}
            className={`level-card ${selectedProfile === profile.value ? 'selected' : ''}`}
            onClick={() => setSelectedProfile(profile.value)}
            type='button'>
            <span className='level-name'>{profile.label}</span>
            <span className='level-desc'>{profile.description}</span>
          </button>
        ))}
      </div>

      {models.length > 0 && (
        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <p style={{ marginBottom: '10px' }}>Select AI Model:</p>
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#fff',
              fontSize: '1rem',
              cursor: 'pointer',
            }}>
            {models.map(model => (
              <option
                key={model.id}
                value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
