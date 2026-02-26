'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { logError } from '@/lib/log-error'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logError({
      source: 'client',
      route: window.location.pathname,
      message: error.message || 'Unknown error',
      stack: error.stack,
      metadata: { digest: error.digest, segment: 'root' },
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-[#0f1829]">
      <div className="w-14 h-14 rounded-2xl bg-red-950/60 ring-1 ring-red-800/50 flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
      <p className="text-sm text-[#60608a] mb-6 max-w-sm">
        An unexpected error occurred. It has been automatically logged.
        {error.digest && <span className="block mt-1 font-mono text-xs text-[#40405a]">ref: {error.digest}</span>}
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary text-sm">Try again</button>
        <Link href="/auth/login" className="btn-secondary text-sm">Go to Login</Link>
      </div>
    </div>
  )
}
