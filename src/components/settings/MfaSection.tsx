'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type MfaFactor = { id: string; status: string; factor_type: string }

export default function MfaSection() {
  const [factors, setFactors] = useState<MfaFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [unenrolling, setUnenrolling] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadFactors()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFactors() {
    setLoading(true)
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors((data?.totp ?? []) as MfaFactor[])
    setLoading(false)
  }

  async function startEnroll() {
    setError(null)
    setEnrolling(true)
    const { data, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (enrollErr || !data) {
      setError(enrollErr?.message ?? 'Failed to start MFA setup.')
      setEnrolling(false)
      return
    }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
  }

  async function verifyCode() {
    if (!factorId || code.length !== 6) return
    setVerifying(true)
    setError(null)
    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (verifyErr) {
      setError(verifyErr.message)
      setVerifying(false)
      return
    }
    setQrCode(null)
    setSecret(null)
    setFactorId(null)
    setCode('')
    setEnrolling(false)
    setVerifying(false)
    setSuccess('Authenticator app enrolled successfully.')
    setTimeout(() => setSuccess(null), 4000)
    await loadFactors()
  }

  async function cancelEnroll() {
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId })
    }
    setQrCode(null)
    setSecret(null)
    setFactorId(null)
    setCode('')
    setEnrolling(false)
    setError(null)
  }

  async function handleUnenroll(id: string) {
    if (!confirm('Remove this authenticator app? You will no longer need a code to sign in.')) return
    setUnenrolling(true)
    setError(null)
    const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId: id })
    if (unenrollErr) {
      setError(unenrollErr.message)
    } else {
      setSuccess('Authenticator app removed.')
      setTimeout(() => setSuccess(null), 4000)
      await loadFactors()
    }
    setUnenrolling(false)
  }

  const verifiedFactors = factors.filter(f => f.status === 'verified')
  const hasMfa = verifiedFactors.length > 0

  if (loading) {
    return (
      <div className="card p-5">
        <h2 className="text-base font-semibold text-white mb-3">Two-Factor Authentication</h2>
        <p className="text-xs text-[#6480a0]">Loading…</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-base font-semibold text-white">Two-Factor Authentication</h2>
        {hasMfa && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 ring-1 ring-emerald-700/50 flex-shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Enabled
          </span>
        )}
      </div>
      <p className="text-xs text-[#6480a0] mb-4">
        Add an extra layer of security to your account by requiring a code from an authenticator app when signing in.
      </p>

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-xs text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-3 p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300">
          {success}
        </div>
      )}

      {/* Enrolled factors */}
      {hasMfa && !enrolling && (
        <div className="space-y-2 mb-4">
          {verifiedFactors.map(f => (
            <div key={f.id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-[#0f1829] border border-[#2a3d58]">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm text-white">Authenticator app</span>
              </div>
              <button
                onClick={() => handleUnenroll(f.id)}
                disabled={unenrolling}
                className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Enroll flow */}
      {enrolling && qrCode ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-[#94a3b8] mb-3">
              1. Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt="MFA QR Code"
              className="w-40 h-40 rounded-xl border border-[#2a3d58] bg-white p-1"
            />
          </div>

          {secret && (
            <div>
              <p className="text-xs text-[#6480a0] mb-1">Or enter the setup key manually:</p>
              <code className="text-xs font-mono text-[#8aa0c0] break-all bg-[#0f1829] px-2 py-1 rounded border border-[#2a3d58] block">
                {secret}
              </code>
            </div>
          )}

          <div>
            <p className="text-sm text-[#94a3b8] mb-2">
              2. Enter the 6-digit code from your app to confirm:
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="form-input w-36 font-mono text-center tracking-widest text-lg"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={verifyCode}
              disabled={verifying || code.length !== 6}
              className="btn-primary text-sm disabled:opacity-40"
            >
              {verifying ? 'Verifying…' : 'Verify & Enable'}
            </button>
            <button
              onClick={cancelEnroll}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : !enrolling ? (
        <button
          onClick={startEnroll}
          className="btn-primary text-sm"
        >
          {hasMfa ? 'Add another authenticator' : 'Set up authenticator app'}
        </button>
      ) : null}
    </div>
  )
}
