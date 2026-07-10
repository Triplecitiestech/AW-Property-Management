'use client'

import { useState, useTransition } from 'react'
import { updateTicketStatus } from '@/lib/actions/tickets'
import type { TicketStatus } from '@/lib/supabase/types'

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export default function WorkOrderStatusSelect({
  workOrderId,
  currentStatus,
}: {
  workOrderId: string
  currentStatus: TicketStatus
}) {
  const [status, setStatus] = useState<TicketStatus>(currentStatus)
  const [isPending, startTransition] = useTransition()

  function handleChange(newStatus: TicketStatus) {
    if (newStatus === status) return
    setStatus(newStatus)
    startTransition(async () => {
      await updateTicketStatus(workOrderId, newStatus)
    })
  }

  return (
    <select
      className={`form-select text-sm font-medium ${isPending ? 'opacity-50' : ''}`}
      value={status}
      onChange={e => handleChange(e.target.value as TicketStatus)}
      disabled={isPending}
    >
      {STATUS_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
