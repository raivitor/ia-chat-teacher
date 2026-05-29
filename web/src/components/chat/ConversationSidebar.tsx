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

  useEffect(() => {
    api.listConversations().then(setConversations).catch(console.error)
  }, [activeId])

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
          <Link
            key={conv.id}
            href={`/chat/${conv.id}`}
            className={`conversation-item ${activeId === conv.id ? 'active' : ''}`}>
            <span className='conv-title'>{conv.title}</span>
            <span className='conv-level'>{conv.level}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
