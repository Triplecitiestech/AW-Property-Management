'use client'

import { useState, useTransition } from 'react'
import { deleteUserAccount } from '@/lib/actions/admin'

export default function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteUserAccount(userId)
      setConfirm(false)
    })
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button onClick={handleDelete} disabled={isPending}
                className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white transition-colors">
          {isPending ? '…' : 'Confirm'}
        </button>
        <button onClick={() => setConfirm(false)}
                className="text-xs px-2 py-1 rounded bg-[#1a2436] text-[#6480a0] hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirm(true)}
            className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-900/20">
      Delete
    </button>
  )
}
