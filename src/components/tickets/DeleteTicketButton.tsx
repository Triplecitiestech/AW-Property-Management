'use client'

import { useTransition } from 'react'
import { deleteTicket } from '@/lib/actions/tickets'

export default function DeleteTicketButton({ ticketId, ticketTitle }: { ticketId: string; ticketTitle: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete ticket "${ticketTitle}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteTicket(ticketId)
    })
  }

  return (
    <button onClick={handleDelete} disabled={isPending} className="btn-danger text-sm w-full justify-center">
      {isPending ? 'Deleting...' : 'Delete Ticket'}
    </button>
  )
}
