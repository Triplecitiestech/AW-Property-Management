'use client'

import { useTransition } from 'react'
import { toggleBillingExempt } from '@/lib/actions/free-invites'
import { useRouter } from 'next/navigation'

export default function BillingExemptButton({
  userId,
  userName,
  isExempt,
  reason,
}: {
  userId: string
  userName: string
  isExempt: boolean
  reason: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleToggle() {
    startTransition(async () => {
      await toggleBillingExempt(
        userId,
        !isExempt,
        !isExempt ? `Manually exempted by admin` : ''
      )
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      title={isExempt ? `${userName} is billing exempt: ${reason}` : `Grant ${userName} free access`}
      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors disabled:opacity-50 ${
        isExempt
          ? 'bg-teal-600/20 border border-teal-500/30 text-teal-300 hover:bg-teal-600/30'
          : 'bg-[#1e2d42] border border-[#2a3d58] text-[#6480a0] hover:text-white hover:border-[#3a5070]'
      }`}
    >
      {isPending ? '...' : isExempt ? 'FREE' : '$'}
    </button>
  )
}
