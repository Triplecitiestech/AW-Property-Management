'use client'

import { useTransition } from 'react'
import { deleteTicket } from '@/lib/actions/tickets'

export default function DeleteWorkOrderButton({ workOrderId, workOrderTitle }: { workOrderId: string; workOrderTitle: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete work order "${workOrderTitle}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteTicket(workOrderId)
    })
  }

  return (
    <button onClick={handleDelete} disabled={isPending} className="btn-danger text-sm w-full justify-center">
      {isPending ? 'Deleting...' : 'Delete Work Order'}
    </button>
  )
}
