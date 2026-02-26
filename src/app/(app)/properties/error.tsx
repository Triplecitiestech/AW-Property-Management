'use client'

export default function PropertiesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Failed to load properties</h2>
        <p className="text-sm text-[#6480a0] mb-4">
          {error.message?.includes('infinite recursion')
            ? 'A database policy fix is being deployed. Please wait a moment and try again.'
            : 'Something went wrong loading this page.'}
        </p>
        {error.digest && (
          <p className="text-xs text-[#4a6080] mb-4">ref: {error.digest}</p>
        )}
        <button onClick={reset} className="btn-primary text-sm">Try again</button>
      </div>
    </div>
  )
}
