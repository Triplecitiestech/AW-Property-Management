'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { startImpersonation } from '@/lib/actions/impersonation'

export default function ImpersonateButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`Impersonate ${userName}? You will see the app as this user.`)) return
    startTransition(async () => {
      const result = await startImpersonation(userId)
      if (result.error) {
        alert(result.error)
        return
      }
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
    >
      {isPending ? '...' : 'Impersonate'}
    </button>
  )
}
