'use client'

import { useState, useTransition } from 'react'
import { createFreeInviteCode, deactivateFreeInviteCode } from '@/lib/actions/free-invites'
import { useRouter } from 'next/navigation'

interface InviteCode {
  id: string
  code: string
  label: string
  max_uses: number | null
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export default function FreeInviteManager({ codes, appUrl }: { codes: InviteCode[]; appUrl: string }) {
  const [label, setLabel] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState<string | null>(null)
  const router = useRouter()

  function handleCreate() {
    if (!label.trim()) return
    startTransition(async () => {
      await createFreeInviteCode(label.trim(), maxUses ? parseInt(maxUses) : null)
      setLabel('')
      setMaxUses('')
      router.refresh()
    })
  }

  function handleDeactivate(codeId: string) {
    startTransition(async () => {
      await deactivateFreeInviteCode(codeId)
      router.refresh()
    })
  }

  function copyLink(code: string) {
    const url = `${appUrl}/auth/login?mode=signup&invite=${code}`
    navigator.clipboard.writeText(url)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const activeCodes = codes.filter(c => c.is_active)
  const inactiveCodes = codes.filter(c => !c.is_active)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Label (e.g. Family, Beta Testers)"
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-[#0f1829] border border-[#1e2d42] text-white text-sm
                     placeholder:text-[#4a6080] focus:outline-none focus:border-violet-500/50"
        />
        <input
          type="number"
          placeholder="Max uses (blank = unlimited)"
          value={maxUses}
          onChange={e => setMaxUses(e.target.value)}
          className="w-48 px-3 py-2 rounded-lg bg-[#0f1829] border border-[#1e2d42] text-white text-sm
                     placeholder:text-[#4a6080] focus:outline-none focus:border-violet-500/50"
        />
        <button
          onClick={handleCreate}
          disabled={isPending || !label.trim()}
          className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium
                     hover:bg-violet-500 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {isPending ? 'Creating...' : 'Create Code'}
        </button>
      </div>

      {activeCodes.length > 0 && (
        <div className="space-y-2">
          {activeCodes.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0f1829] border border-[#1e2d42]">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{c.label || 'Untitled'}</span>
                  <span className="text-xs text-[#4a6080]">
                    {c.used_count} used{c.max_uses !== null ? ` / ${c.max_uses} max` : ''}
                  </span>
                </div>
                <p className="text-xs text-[#4a6080] font-mono mt-0.5 truncate">{c.code}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => copyLink(c.code)}
                  className="px-3 py-1.5 rounded-md bg-teal-600/20 border border-teal-500/30 text-teal-300 text-xs font-medium
                             hover:bg-teal-600/30 transition-colors"
                >
                  {copied === c.code ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={() => handleDeactivate(c.id)}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-md bg-rose-600/20 border border-rose-500/30 text-rose-300 text-xs font-medium
                             hover:bg-rose-600/30 disabled:opacity-50 transition-colors"
                >
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeCodes.length === 0 && (
        <p className="text-sm text-[#4a6080] text-center py-4">No active invite codes. Create one above.</p>
      )}

      {inactiveCodes.length > 0 && (
        <details className="text-sm">
          <summary className="text-[#4a6080] cursor-pointer hover:text-[#6480a0] transition-colors">
            {inactiveCodes.length} deactivated code{inactiveCodes.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-1">
            {inactiveCodes.map(c => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1a] text-[#4a6080]">
                <span className="text-xs">{c.label} — {c.used_count} used</span>
                <span className="text-xs font-mono">{c.code.slice(0, 12)}...</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
