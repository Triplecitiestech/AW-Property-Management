'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { stopImpersonation } from '@/lib/actions/impersonation'

export default function ImpersonationBanner({ targetName }: { targetName: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleStop() {
    startTransition(async () => {
      await stopImpersonation()
      router.push('/admin')
      router.refresh()
    })
  }

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-rose-600/90 backdrop-blur-sm border-b border-rose-500/50 px-4 py-2 flex items-center justify-center gap-4 text-sm text-white">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      <span>
        Viewing as <strong>{targetName}</strong>
      </span>
      <button
        onClick={handleStop}
        disabled={isPending}
        className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors disabled:opacity-50"
      >
        {isPending ? 'Stopping...' : 'Stop Impersonating'}
      </button>
    </div>
  )
}
