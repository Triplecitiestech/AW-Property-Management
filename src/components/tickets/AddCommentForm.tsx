'use client'

import { useState, useTransition } from 'react'
import { addTicketComment } from '@/lib/actions/tickets'

export default function AddCommentForm({ requestId }: { requestId: string }) {
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addTicketComment(requestId, content)
      if (result?.error) {
        setError(result.error)
      } else {
        setContent('')
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
        placeholder="Add a comment..."
        required
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" className="btn-primary text-sm" disabled={isPending || !content.trim()}>
        {isPending ? 'Posting...' : 'Post Comment'}
      </button>
    </form>
  )
}
