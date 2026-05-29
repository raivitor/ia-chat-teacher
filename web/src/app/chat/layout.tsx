import ConversationSidebar from '../../components/chat/ConversationSidebar'

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='chat-layout'>
      <ConversationSidebar />
      <main className='chat-main'>{children}</main>
    </div>
  )
}
