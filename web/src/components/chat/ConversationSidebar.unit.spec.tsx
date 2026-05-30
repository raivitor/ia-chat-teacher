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
  model: 'model-a',
  title: 'First conversation',
  metadata: {},
  createdAt: '',
  updatedAt: '',
}

const conv2 = {
  id: 'conv-2',
  seq: 2,
  level: 'A2',
  model: 'model-a',
  title: 'Second conversation',
  metadata: {},
  createdAt: '',
  updatedAt: '',
}

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>)
  vi.mocked(useParams).mockReturnValue({})
  vi.mocked(api.listConversations).mockResolvedValue([conv1, conv2])
  vi.mocked(api.deleteConversation).mockResolvedValue()
  mockPush.mockReset()
})

describe('ConversationSidebar', () => {
  it('shows empty state when there are no conversations', async () => {
    vi.mocked(api.listConversations).mockResolvedValue([])
    render(<ConversationSidebar />)

    await waitFor(() => {
      expect(screen.getByText('No conversations yet.')).toBeInTheDocument()
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

  it('navigates to /onboarding when "+ New" is clicked', async () => {
    render(<ConversationSidebar />)

    await userEvent.click(screen.getByRole('button', { name: '+ New' }))

    expect(mockPush).toHaveBeenCalledWith('/onboarding')
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
