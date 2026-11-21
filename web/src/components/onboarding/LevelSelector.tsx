'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import { api, type AIModel, type Level, type Profile } from '../../lib/api'
import { PROFILE_META } from '../../lib/profiles'

const LEVELS: { value: Level; label: string; description: string }[] = [
  { value: 'A1', label: 'A1 — Iniciante', description: 'Você conhece algumas palavras e frases básicas.' },
  {
    value: 'A2',
    label: 'A2 — Básico',
    description: 'Você consegue falar sobre assuntos familiares de forma simples.',
  },
  {
    value: 'B1',
    label: 'B1 — Intermediário',
    description: 'Você lida bem com a maioria das situações do dia a dia.',
  },
  {
    value: 'B2',
    label: 'B2 — Intermediário Superior',
    description: 'Você discute assuntos complexos com confiança.',
  },
  {
    value: 'C1',
    label: 'C1 — Avançado',
    description: 'Você se expressa com fluência e espontaneidade.',
  },
  { value: 'C2', label: 'C2 — Proficiente', description: 'Você domina o idioma com naturalidade.' },
]

const PROFILES: Profile[] = ['professor', 'bestfriend', 'secretary', 'girlfriend']

const LEVEL_STORAGE_KEY = 'preferredLevel'
const PROFILE_STORAGE_KEY = 'preferredProfile'
const WEB_SEARCH_STORAGE_KEY = 'webSearchEnabled'

export default function LevelSelector() {
  const router = useRouter()
  const [selected, setSelected] = useState<Level>('B1')
  const [selectedProfile, setSelectedProfile] = useState<Profile>('professor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [models, setModels] = useState<AIModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  // Intentional: reads localStorage once after mount to avoid SSR hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem(LEVEL_STORAGE_KEY)
    if (stored && LEVELS.some(l => l.value === stored)) setSelected(stored as Level)

    const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (storedProfile && PROFILES.includes(storedProfile as Profile)) setSelectedProfile(storedProfile as Profile)

    const storedWebSearch = localStorage.getItem(WEB_SEARCH_STORAGE_KEY)
    if (storedWebSearch !== null) setWebSearchEnabled(storedWebSearch === 'true')
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
      localStorage.setItem(WEB_SEARCH_STORAGE_KEY, String(webSearchEnabled))
      const conversation = await api.createConversation(
        selected,
        selectedModel || undefined,
        selectedProfile,
        webSearchEnabled,
      )
      router.push(`/chat/${conversation.id}`)
    } catch {
      setError('Não foi possível iniciar a conversa. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className='level-selector'>
      <h1>English Writing Coach</h1>
      <p>Selecione seu nível de inglês para começar:</p>
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

      <p style={{ marginTop: '24px', marginBottom: '10px' }}>Escolha o estilo da conversa:</p>
      <div className='levels'>
        {PROFILES.map(profile => {
          const meta = PROFILE_META[profile]
          return (
            <button
              key={profile}
              className={`level-card ${selectedProfile === profile ? 'selected' : ''}`}
              onClick={() => setSelectedProfile(profile)}
              type='button'>
              <span className='level-name'>{meta.label}</span>
              <span className='level-desc'>{meta.description}</span>
            </button>
          )
        })}
      </div>

      {models.length > 0 && (
        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <p style={{ marginBottom: '10px' }}>Selecione o modelo de IA:</p>
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

      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            padding: '14px 16px',
            borderRadius: '8px',
            border: `1px solid ${webSearchEnabled ? '#6366f1' : '#e2e8f0'}`,
            backgroundColor: webSearchEnabled ? '#eef2ff' : '#fff',
            userSelect: 'none',
          }}>
          <input
            type='checkbox'
            checked={webSearchEnabled}
            onChange={e => setWebSearchEnabled(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span>
            <strong>Busca na Web</strong>
            <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b' }}>
              Permitir que a IA pesquise na web por informações atualizadas
            </span>
          </span>
        </label>
      </div>

      {error && <p className='error'>{error}</p>}
      <button
        className='start-btn'
        onClick={handleStart}
        disabled={loading}
        type='button'>
        {loading ? 'Iniciando...' : 'Iniciar conversa'}
      </button>
    </div>
  )
}
