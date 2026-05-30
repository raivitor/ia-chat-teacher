import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('../../lib/api', () => ({
  api: {
    getModels: vi.fn(),
    createConversation: vi.fn(),
  },
}))

import { useRouter } from 'next/navigation'
import { api } from '../../lib/api'
import LevelSelector from './LevelSelector'

const mockPush = vi.fn()

const mockModelsResponse = {
  models: [
    { id: 'model-a', name: 'Model A', contextWindow: 8192 },
    { id: 'model-b', name: 'Model B', contextWindow: 32768 },
  ],
  defaultModel: 'model-a',
  fallbackModel: 'model-b',
  productionRecommendedModel: 'model-a',
  contextWindow: 8192,
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>)
  vi.mocked(api.getModels).mockResolvedValue(mockModelsResponse)
  vi.mocked(api.createConversation).mockResolvedValue({
    id: 'new-conv',
    seq: 1,
    level: 'B1',
    profile: 'professor',
    model: 'model-a',
    title: 'New',
    metadata: {},
    webSearchEnabled: false,
    reviewedAt: null,
    createdAt: '',
    updatedAt: '',
  })
  mockPush.mockReset()
})

describe('LevelSelector', () => {
  it('renders all 6 level buttons', () => {
    render(<LevelSelector />)

    expect(screen.getByText(/A1/)).toBeInTheDocument()
    expect(screen.getByText(/A2/)).toBeInTheDocument()
    expect(screen.getByText(/B1/)).toBeInTheDocument()
    expect(screen.getByText(/B2/)).toBeInTheDocument()
    expect(screen.getByText(/C1/)).toBeInTheDocument()
    expect(screen.getByText(/C2/)).toBeInTheDocument()
  })

  it('defaults to B1 when no localStorage entry', () => {
    render(<LevelSelector />)

    const b1Button = screen.getByRole('button', { name: /B1/ })
    expect(b1Button).toHaveClass('selected')
  })

  it('reads preferred level from localStorage on mount', () => {
    localStorage.setItem('preferredLevel', 'C1')
    render(<LevelSelector />)

    expect(screen.getByRole('button', { name: /C1/ })).toHaveClass('selected')
  })

  it('ignores invalid localStorage value and falls back to B1', () => {
    localStorage.setItem('preferredLevel', 'Z9')
    render(<LevelSelector />)

    expect(screen.getByRole('button', { name: /B1/ })).toHaveClass('selected')
  })

  it('updates selected level when a level card is clicked', async () => {
    render(<LevelSelector />)

    await userEvent.click(screen.getByRole('button', { name: /A2/ }))

    expect(screen.getByRole('button', { name: /A2/ })).toHaveClass('selected')
    expect(screen.getByRole('button', { name: /B1/ })).not.toHaveClass('selected')
  })

  it('loads and renders models from api on mount', async () => {
    render(<LevelSelector />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    expect(screen.getByRole('option', { name: 'Model A' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Model B' })).toBeInTheDocument()
  })

  it('creates conversation with selected level and model, then redirects', async () => {
    render(<LevelSelector />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /A1/ }))
    await userEvent.click(screen.getByRole('button', { name: /Start Conversation/ }))

    await waitFor(() => {
      expect(api.createConversation).toHaveBeenCalledWith('A1', 'model-a', 'professor', false)
      expect(mockPush).toHaveBeenCalledWith('/chat/new-conv')
    })
  })

  it('saves selected level to localStorage on start', async () => {
    render(<LevelSelector />)

    await userEvent.click(screen.getByRole('button', { name: /C2/ }))
    await userEvent.click(screen.getByRole('button', { name: /Start Conversation/ }))

    await waitFor(() => {
      expect(localStorage.getItem('preferredLevel')).toBe('C2')
    })
  })

  it('shows error message when conversation creation fails', async () => {
    vi.mocked(api.createConversation).mockRejectedValue(new Error('Server error'))

    render(<LevelSelector />)

    await userEvent.click(screen.getByRole('button', { name: /Start Conversation/ }))

    await waitFor(() => {
      expect(screen.getByText(/Failed to start conversation/)).toBeInTheDocument()
    })
  })

  it('shows loading state while creating conversation', async () => {
    let resolveCreate!: () => void
    vi.mocked(api.createConversation).mockReturnValue(
      new Promise(resolve => {
        resolveCreate = () =>
          resolve({
            id: 'new-conv',
            seq: 1,
            level: 'B1',
            profile: 'professor',
            model: 'model-a',
            title: 'New',
            metadata: {},
            webSearchEnabled: false,
            reviewedAt: null,
            createdAt: '',
            updatedAt: '',
          })
      }),
    )

    render(<LevelSelector />)
    await userEvent.click(screen.getByRole('button', { name: /Start Conversation/ }))

    expect(screen.getByRole('button', { name: /Starting.../ })).toBeDisabled()

    resolveCreate()
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled()
    })
  })
})
