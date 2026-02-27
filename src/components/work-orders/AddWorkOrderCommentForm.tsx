'use client'

import { useState, useTransition } from 'react'
import { addTicketComment } from '@/lib/actions/tickets'

export default function AddWorkOrderCommentForm({ requestId }: { requestId: string }) {
  const [content, setContent] = useState('')
  const [isInternal, setIsInternal] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addTicketComment(requestId, content, isInternal)
      if (result?.error) {
        setError(result.error)
      } else {
        setContent('')
        setIsInternal(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        className="form-input text-sm"
        rows={3}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={isInternal ? 'Internal note (only visible to your team)…' : 'External message (sent to assigned contact)…'}
        required
      />
      {/* Internal / External toggle */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setIsInternal(v => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
              isInternal ? 'bg-violet-600' : 'bg-teal-600'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              isInternal ? '' : 'translate-x-4'
            }`} />
          </div>
          <span className="text-xs font-medium text-[#94a3b8]">
            {isInternal ? (
              <><span className="text-violet-400">Internal</span> — team only</>
            ) : (
              <><span className="text-teal-400">External</span> — notifies assigned contact</>
            )}
          </span>
        </label>
      </div>
      {!isInternal && (
        <p className="text-xs text-sky-400/80 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
          This message will be emailed to the assigned contact on this work order.
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" className={`text-sm ${isInternal ? 'btn-secondary' : 'btn-primary'}`} disabled={isPending || !content.trim()}>
        {isPending ? 'Posting...' : isInternal ? 'Post Internal Note' : 'Send to Contact'}
      </button>
    </form>
  )
}
