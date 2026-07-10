'use client'

import { useState } from 'react'
import { deleteAccount } from '@/lib/actions/auth'

export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-4 py-2 rounded-lg border border-red-800/60 bg-red-950/30 text-red-400 text-sm font-medium hover:bg-red-950/60 hover:border-red-700 transition-colors"
      >
        Delete Account
      </button>
    )
  }

  async function handleDelete() {
    if (confirmText !== 'DELETE') return
    setLoading(true)
    setError(null)
    const result = await deleteAccount()
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      <p className="text-sm text-red-300">
        This will permanently delete your account and all associated data (properties, stays, work orders, contacts). This action cannot be undone.
      </p>
      <p className="text-sm text-[#8aa0be]">
        Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
      </p>
      <input
        type="text"
        className="form-input w-full max-w-xs"
        value={confirmText}
        onChange={e => setConfirmText(e.target.value)}
        placeholder="DELETE"
        autoComplete="off"
      />
      <div className="flex gap-3">
        <button
          onClick={handleDelete}
          disabled={confirmText !== 'DELETE' || loading}
          className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Deleting…' : 'Permanently Delete Account'}
        </button>
        <button
          onClick={() => { setConfirming(false); setConfirmText('') }}
          className="btn-secondary text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
