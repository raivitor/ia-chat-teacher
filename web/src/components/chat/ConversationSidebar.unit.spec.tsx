import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a
      href={href}
      className={className}>
      {children}
    </a>
  ),
}))

vi.mock('../../lib/api', () => ({
  api: {
    listConversations: vi.fn(),
    deleteConversation: vi.fn(),
    getUnreviewedCount: vi.fn(),
    generateReview: vi.fn(),
  },
}))

import { useParams, useRouter } from 'next/navigation'
import { api } from '../../lib/api'
import ConversationSidebar from './ConversationSidebar'

const mockPush = vi.fn()

const conv1 = {
  id: 'conv-1',
  seq: 1,
  level: 'B1',
  profile: 'professor' as const,
  model: 'model-a',
  title: 'First conversation',
  metadata: {},
  webSearchEnabled: false,
  finishedAt: null,
  reviewedAt: null,
  createdAt: '',
  updatedAt: '',
}

const conv2 = {
  id: 'conv-2',
  seq: 2,
  level: 'A2',
  profile: 'professor' as const,
  model: 'model-a',
  title: 'Second conversation',
  metadata: {},
  webSearchEnabled: false,
  finishedAt: null,
  reviewedAt: null,
  createdAt: '',
  updatedAt: '',
}

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>)
  vi.mocked(useParams).mockReturnValue({})
  vi.mocked(api.listConversations).mockResolvedValue([conv1, conv2])
  vi.mocked(api.deleteConversation).mockResolvedValue()
  vi.mocked(api.getUnreviewedCount).mockResolvedValue(0)
  mockPush.mockReset()
})

describe('ConversationSidebar', () => {
  it('shows empty state when there are no conversations', async () => {
    vi.mocked(api.listConversations).mockResolvedValue([])
    render(<ConversationSidebar />)

    await waitFor(() => {
      expect(screen.getByText('Nenhuma conversa ainda.')).toBeInTheDocument()
    })
  })

  it('fetches and renders conversations on mount', async () => {
    render(<ConversationSidebar />)

    await waitFor(() => {
      expect(screen.getByText('First conversation')).toBeInTheDocument()
      expect(screen.getByText('Second conversation')).toBeInTheDocument()
    })
  })

  it('highlights the active conversation', async () => {
    vi.mocked(useParams).mockReturnValue({ id: 'conv-1' })
    render(<ConversationSidebar />)

    await waitFor(() => {
      expect(screen.getByText('First conversation')).toBeInTheDocument()
    })

    const activeItem = document.querySelector('.conversation-item.active')
    expect(activeItem).toBeInTheDocument()
    expect(activeItem).toHaveTextContent('First conversation')
  })

  it('navigates to /onboarding when "+ Nova" is clicked', async () => {
    render(<ConversationSidebar />)

    await userEvent.click(screen.getByRole('button', { name: '+ Nova' }))

    expect(mockPush).toHaveBeenCalledWith('/onboarding')
  })

  it('displays status badges for finished and reviewed conversations', async () => {
    vi.mocked(api.listConversations).mockResolvedValue([
      { ...conv1, finishedAt: '2026-11-20T22:00:00.000Z', reviewedAt: null },
      { ...conv2, finishedAt: '2026-11-20T22:00:00.000Z', reviewedAt: '2026-11-20T22:10:00.000Z' },
    ])
    render(<ConversationSidebar />)

    await waitFor(() => {
      expect(screen.getByText('Pronta p/ revisão')).toBeInTheDocument()
      expect(screen.getByText('Revisada')).toBeInTheDocument()
    })
  })

  it('shows visible error when generating review fails', async () => {
    vi.mocked(api.getUnreviewedCount).mockResolvedValue(2)
    vi.mocked(api.generateReview).mockRejectedValue(new Error('API error'))
    render(<ConversationSidebar />)

    const reviewButton = await screen.findByRole('button', { name: /Gerar revisão \(2\)/ })
    await userEvent.click(reviewButton)

    await waitFor(() => {
      expect(screen.getByText(/Não foi possível gerar a revisão/)).toBeInTheDocument()
    })
  })

  it('opens delete confirmation dialog when delete button is clicked', async () => {
    render(<ConversationSidebar />)

    await waitFor(() => {
      expect(screen.getByText('First conversation')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByLabelText('Apagar conversa')
    await userEvent.click(deleteButtons[0])

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Apagar conversa')).toBeInTheDocument()
  })

  it('cancels deletion and closes dialog when Cancelar is clicked', async () => {
    render(<ConversationSidebar />)

    await waitFor(() => {
      expect(screen.getByText('First conversation')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByLabelText('Apagar conversa')
    await userEvent.click(deleteButtons[0])
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.deleteConversation).not.toHaveBeenCalled()
  })

  it('calls deleteConversation and removes conversation when Apagar is confirmed', async () => {
    render(<ConversationSidebar />)

    await waitFor(() => {
      expect(screen.getByText('First conversation')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByLabelText('Apagar conversa')
    await userEvent.click(deleteButtons[0])
    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }))

    await waitFor(() => {
      expect(api.deleteConversation).toHaveBeenCalledWith('conv-1')
      expect(screen.queryByText('First conversation')).not.toBeInTheDocument()
    })
  })

  it('navigates to /chat when the active conversation is deleted', async () => {
    vi.mocked(useParams).mockReturnValue({ id: 'conv-1' })
    render(<ConversationSidebar />)

    await waitFor(() => {
      expect(screen.getByText('First conversation')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByLabelText('Apagar conversa')
    await userEvent.click(deleteButtons[0])
    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/chat')
    })
  })

  it('does not navigate away when a non-active conversation is deleted', async () => {
    vi.mocked(useParams).mockReturnValue({ id: 'conv-2' })
    render(<ConversationSidebar />)

    await waitFor(() => {
      expect(screen.getByText('First conversation')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByLabelText('Apagar conversa')
    await userEvent.click(deleteButtons[0]) // delete conv-1
    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }))

    await waitFor(() => {
      expect(api.deleteConversation).toHaveBeenCalledWith('conv-1')
    })
    expect(mockPush).not.toHaveBeenCalled()
  })
})
