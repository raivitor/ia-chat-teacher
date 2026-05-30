'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { api, type Conversation } from '../../lib/api'

export default function ConversationSidebar() {
  const router = useRouter()
  const params = useParams()
  const activeId = params?.id as string | undefined
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const [unreviewedCount, setUnreviewedCount] = useState(0)
  const [reviewLoading, setReviewLoading] = useState(false)

  useEffect(() => {
    api.listConversations().then(setConversations).catch(console.error)
    api.getUnreviewedCount().then(setUnreviewedCount).catch(console.error)
  }, [activeId])

  async function handleDelete(id: string) {
    await api.deleteConversation(id)
    setConversations(prev => prev.filter(c => c.id !== id))
    setConversationToDelete(null)
    if (id === activeId) {
      router.push('/chat')
    }
  }

  async function handleGenerateReview() {
    setReviewLoading(true)
    try {
      const blob = await api.generateReview()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'anki-review.txt'
      a.click()
      URL.revokeObjectURL(url)
      setUnreviewedCount(0)
    } catch {
      // silently fail — user can retry
    } finally {
      setReviewLoading(false)
    }
  }

  return (
    <aside className='conversation-sidebar'>
      <div className='sidebar-header'>
        <h2>Conversations</h2>
        <button
          onClick={() => router.push('/onboarding')}
          type='button'
          className='new-btn'>
          + New
        </button>
      </div>
      <nav className='conversation-list'>
        {conversations.length === 0 && <p className='empty'>No conversations yet.</p>}
        {conversations.map(conv => (
          <div
            key={conv.id}
            className={`conversation-item ${activeId === conv.id ? 'active' : ''}`}>
            <Link
              href={`/chat/${conv.id}`}
              className='conv-info'>
              <span className='conv-title'>{conv.title}</span>
              <span className='conv-level'>{conv.level}</span>
            </Link>
            <button
              type='button'
              className='conv-delete-btn'
              aria-label='Apagar conversa'
              onClick={() => setConversationToDelete(conv.id)}>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                aria-hidden='true'>
                <polyline points='3 6 5 6 21 6' />
                <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
                <path d='M10 11v6' />
                <path d='M14 11v6' />
                <path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' />
              </svg>
            </button>
          </div>
        ))}
      </nav>

      {conversationToDelete !== null && (
        <div
          className='delete-confirm-overlay'
          role='dialog'
          aria-modal='true'
          aria-labelledby='delete-dialog-title'>
          <div className='delete-confirm-dialog'>
            <h3
              id='delete-dialog-title'
              className='delete-dialog-title'>
              Apagar conversa
            </h3>
            <p className='delete-dialog-body'>
              Tem certeza que deseja apagar esta conversa? Esta ação não pode ser desfeita.
            </p>
            <div className='delete-dialog-actions'>
              <button
                type='button'
                className='delete-dialog-cancel'
                onClick={() => setConversationToDelete(null)}>
                Cancelar
              </button>
              <button
                type='button'
                className='delete-dialog-confirm'
                onClick={() => handleDelete(conversationToDelete)}>
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className='sidebar-footer'>
        <button
          type='button'
          className='review-btn'
          disabled={unreviewedCount === 0 || reviewLoading}
          onClick={handleGenerateReview}>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'>
            <rect
              x='2'
              y='3'
              width='20'
              height='14'
              rx='2'
              ry='2'
            />
            <line
              x1='8'
              y1='21'
              x2='16'
              y2='21'
            />
            <line
              x1='12'
              y1='17'
              x2='12'
              y2='21'
            />
          </svg>
          <span>
            {reviewLoading
              ? 'Gerando revisão...'
              : unreviewedCount > 0
                ? `Gerar revisão (${unreviewedCount})`
                : 'Nenhuma revisão pendente'}
          </span>
        </button>
        <button
          type='button'
          className='settings-btn'
          onClick={() => router.push('/onboarding')}>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'>
            <circle
              cx='12'
              cy='12'
              r='3'
            />
            <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' />
          </svg>
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  )
}
