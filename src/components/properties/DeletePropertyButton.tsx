'use client'

import { useTransition } from 'react'
import { deleteProperty } from '@/lib/actions/properties'

export default function DeletePropertyButton({
  propertyId,
  propertyName,
}: {
  propertyId: string
  propertyName: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete "${propertyName}"? This will also delete all stays, tickets, and reports. This cannot be undone.`)) return
    startTransition(async () => {
      await deleteProperty(propertyId)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="btn-danger text-sm w-full justify-center"
    >
      {isPending ? 'Deleting...' : 'Delete Property'}
    </button>
  )
}
