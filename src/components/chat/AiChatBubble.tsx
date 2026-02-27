'use client'

import { useState, useEffect, useRef, useTransition } from 'react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  channel: 'web' | 'sms'
  created_at: string
}

/** Render message text with URLs converted to clickable links */
function MessageContent({ content }: { content: string }) {
  const URL_RE = /(https?:\/\/[^\s]+)/g
  const parts = content.split(URL_RE)
  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-teal-300 hover:text-teal-200 transition-colors"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  )
}

export default function AiChatBubble() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load conversation history when first opened
  useEffect(() => {
    if (!open || loaded) return
    fetch('/api/chat')
      .then(r => r.json())
      .then(d => { setMessages(d.messages ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [open, loaded])

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage() {
    const text = input.trim()
    if (!text || isPending) return
    setInput('')

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      role: 'user',
      content: text,
      channel: 'web',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    startTransition(async () => {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        })
        const data = await res.json()
        if (data.reply) {
          setMessages(prev => [...prev, {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: data.reply,
            channel: 'web',
            created_at: new Date().toISOString(),
          }])
        }
      } catch {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          channel: 'web',
          created_at: new Date().toISOString(),
        }])
      }
    })
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 flex flex-col shadow-2xl shadow-black/60
                        rounded-2xl border border-[#2a3d58] bg-[#0f1829] overflow-hidden"
             style={{ height: '480px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-900/80 to-teal-900/50 border-b border-[#2a3d58]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-teal-400 flex items-center justify-center flex-shrink-0">
                <span className="text-xs">🏠</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Smart Sumi AI</p>
                <p className="text-[10px] text-teal-400">Synced with SMS · always available</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#60608a] hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!loaded && (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {loaded && messages.length === 0 && (
              <div className="text-center text-[#60608a] text-sm mt-8">
                <p className="text-2xl mb-2">🏠</p>
                <p className="font-medium text-white mb-1">Hi! I&apos;m your AI Property Manager</p>
                <p className="text-xs leading-relaxed">Ask me about your properties, create work orders, schedule stays, or anything else. I&apos;m the same AI you text!</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : 'bg-[#1a2436] text-[#cbd5e1] rounded-bl-sm border border-[#2a3d58]'
                }`}>
                  {msg.channel === 'sms' && msg.role === 'user' && (
                    <span className="text-[10px] text-violet-300 block mb-1">via SMS</span>
                  )}
                  {msg.channel === 'sms' && msg.role === 'assistant' && (
                    <span className="text-[10px] text-teal-400 block mb-1">SMS reply</span>
                  )}
                  <MessageContent content={msg.content} />
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="bg-[#1a2436] border border-[#2a3d58] rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[#2a3d58] bg-[#0c1220]">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[#1a2436] border border-[#2a3d58] rounded-xl px-3 py-2 text-sm text-white placeholder-[#4a6080]
                           focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Ask your AI anything…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                disabled={isPending}
              />
              <button
                onClick={sendMessage}
                disabled={isPending || !input.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-2xl shadow-violet-900/60
                   bg-gradient-to-br from-violet-600 to-teal-500 flex items-center justify-center
                   hover:scale-110 transition-transform"
        aria-label="Open AI chat"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </>
  )
}
