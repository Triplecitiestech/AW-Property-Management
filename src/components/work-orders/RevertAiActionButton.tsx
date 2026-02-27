'use client'

import { useState, useTransition } from 'react'
import { revertAiAction } from '@/lib/actions/tickets'

export default function RevertAiActionButton({ auditId, alreadyReverted }: { auditId: string; alreadyReverted: boolean }) {
  const [done, setDone] = useState(alreadyReverted)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (done) {
    return <span className="text-xs text-[#4a6080] italic">Reverted</span>
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={isPending}
        onClick={() => {
          if (!confirm('Undo this AI action? For a created WO, it will be closed. For an update, previous values will be restored.')) return
          startTransition(async () => {
            const result = await revertAiAction(auditId)
            if (result.error) setError(result.error)
            else setDone(true)
          })
        }}
        className="text-xs text-sky-400 hover:text-sky-300 border border-sky-500/30 hover:border-sky-400/50
                   px-2 py-0.5 rounded transition-all disabled:opacity-50"
      >
        {isPending ? 'Undoing…' : 'Undo'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
