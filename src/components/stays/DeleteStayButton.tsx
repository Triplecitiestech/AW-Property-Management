'use client'

import { useTransition } from 'react'
import { deleteStay } from '@/lib/actions/stays'

export default function DeleteStayButton({ stayId, guestName }: { stayId: string; guestName: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete stay for "${guestName}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteStay(stayId)
    })
  }

  return (
    <button onClick={handleDelete} disabled={isPending} className="btn-danger text-sm w-full justify-center">
      {isPending ? 'Deleting...' : 'Delete Stay'}
    </button>
  )
}
