'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { acceptInvitation } from '@/lib/actions/organizations'

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Resolve token from async params
  useEffect(() => {
    params.then(p => setToken(p.token))
  }, [params])

  // Check auth state
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
  }, [])

  function handleAccept() {
    if (!token) return
    setError(null)
    startTransition(async () => {
      const result = await acceptInvitation(token)
      if ('error' in result) {
        setError(result.error)
      } else {
        setAccepted(true)
        // Redirect after a short delay
        setTimeout(() => {
          if (result.type === 'org') {
            router.push('/settings')
          } else {
            router.push(`/properties/${result.targetId}`)
          }
        }, 1500)
      }
    })
  }

  // Loading state
  if (isLoggedIn === null || token === null) {
    return (
      <div className="min-h-screen bg-[#0f1829] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1829] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5
                          bg-gradient-to-br from-violet-600 to-cyan-500 shadow-2xl shadow-violet-900/60">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">You&apos;ve been invited</h1>
          <p className="text-[#6480a0] mt-1 text-sm">Join Smart Sumai</p>
        </div>

        <div className="card p-8">
          {accepted ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-emerald-950 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-700/40">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-semibold">Invitation accepted!</p>
              <p className="text-sm text-[#6480a0]">Redirecting you now…</p>
            </div>
          ) : !isLoggedIn ? (
            <div className="space-y-4">
              <p className="text-sm text-[#94a3b8]">
                You need to be signed in to accept this invitation. Sign in or create an account, then come back to this link.
              </p>
              <Link
                href={`/auth/login?next=/invite/${token}`}
                className="btn-primary w-full justify-center"
              >
                Sign In to Accept
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-4 bg-[#0f1829] rounded-xl border border-[#2a3d58] text-sm text-[#94a3b8]">
                You&apos;re about to join a team on Smart Sumai. Click below to accept.
              </div>

              {error && (
                <div className="p-3 bg-red-950/60 text-red-300 rounded-xl text-sm border border-red-800/50">
                  {error}
                </div>
              )}

              <button
                onClick={handleAccept}
                disabled={isPending}
                className="btn-primary w-full justify-center"
              >
                {isPending ? 'Accepting…' : 'Accept Invitation'}
              </button>

              <p className="text-center text-xs text-[#4a6080]">
                Not what you expected?{' '}
                <Link href="/dashboard" className="text-violet-400 hover:text-violet-300">
                  Go to dashboard
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
