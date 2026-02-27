'use client'

import { useState, useTransition } from 'react'
import { parseUnitIdentifiers } from '@/lib/unit-parser'
import { bulkCreateUnits } from '@/lib/actions/units'

export default function BulkUnitCreateModal({
  propertyId,
  existingIdentifiers,
  unitLabel,
  onClose,
  onCreated,
}: {
  propertyId: string
  existingIdentifiers: string[]
  unitLabel: string
  onClose: () => void
  onCreated: (count: number) => void
}) {
  const [rawInput, setRawInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const existingSet = new Set(existingIdentifiers)
  const parsed = parseUnitIdentifiers(rawInput)
  const duplicates = parsed.identifiers.filter(id => existingSet.has(id))
  const willCreate = parsed.identifiers.filter(id => !existingSet.has(id))

  function handleConfirm() {
    if (willCreate.length === 0) return
    setServerError(null)
    startTransition(async () => {
      const res = await bulkCreateUnits(propertyId, willCreate)
      if ('error' in res) {
        setServerError(res.error)
      } else {
        setResult(res)
        onCreated(res.created)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-lg rounded-2xl border border-[#2a3d58] bg-[#0f1829] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d42]">
          <h2 className="text-base font-semibold text-white">Bulk Add {unitLabel}s</h2>
          <button onClick={onClose} className="text-[#6480a0] hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Input */}
          <div>
            <label className="text-xs font-medium text-[#8aa0be] block mb-2">
              Enter identifiers — ranges, comma lists, or one per line
            </label>
            <textarea
              className="w-full bg-[#1a2436] border border-[#2a3d58] rounded-xl text-white text-sm
                         placeholder-[#4a6080] px-3 py-2.5 focus:outline-none focus:border-violet-500
                         font-mono resize-none"
              rows={4}
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              placeholder={"101-150\n56A-56D\n201, 202, 203"}
              disabled={isPending || !!result}
            />
            <p className="text-[11px] text-[#4a6080] mt-1.5 leading-relaxed">
              Numeric range: <span className="text-[#8aa0be]">101-150</span> &nbsp;·&nbsp;
              Letter suffix: <span className="text-[#8aa0be]">56A-56D</span> &nbsp;·&nbsp;
              Comma list: <span className="text-[#8aa0be]">201, 202, 203</span>
            </p>
          </div>

          {/* Parse error */}
          {rawInput.trim() && parsed.error && (
            <div className="rounded-lg bg-red-950/30 border border-red-500/30 px-4 py-3">
              <p className="text-sm text-red-400">{parsed.error}</p>
            </div>
          )}

          {/* Preview */}
          {!parsed.error && parsed.identifiers.length > 0 && (
            <div className="space-y-3">
              {/* Will create */}
              {willCreate.length > 0 && (
                <div className="rounded-lg bg-emerald-950/20 border border-emerald-500/20 px-4 py-3">
                  <p className="text-xs font-semibold text-emerald-400 mb-2">
                    Will create {willCreate.length} {unitLabel}{willCreate.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {willCreate.map(id => (
                      <span key={id} className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-900/30
                                                 border border-emerald-700/30 text-emerald-300 font-mono">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicates */}
              {duplicates.length > 0 && (
                <div className="rounded-lg bg-sky-950/20 border border-sky-500/20 px-4 py-3">
                  <p className="text-xs font-semibold text-sky-400 mb-2">
                    {duplicates.length} duplicate{duplicates.length !== 1 ? 's' : ''} will be skipped
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {duplicates.slice(0, 20).map(id => (
                      <span key={id} className="text-[11px] px-1.5 py-0.5 rounded bg-sky-900/30
                                                 border border-sky-700/30 text-sky-300 font-mono">
                        {id}
                      </span>
                    ))}
                    {duplicates.length > 20 && (
                      <span className="text-[11px] text-sky-500">+{duplicates.length - 20} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Server error */}
          {serverError && (
            <div className="rounded-lg bg-red-950/30 border border-red-500/30 px-4 py-3">
              <p className="text-sm text-red-400">{serverError}</p>
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/30 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-emerald-400">
                Created {result.created} {unitLabel}{result.created !== 1 ? 's' : ''}
                {result.skipped > 0 && `, ${result.skipped} skipped`}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#1e2d42]">
          <button onClick={onClose} className="btn-secondary text-sm">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleConfirm}
              disabled={isPending || willCreate.length === 0 || !!parsed.error}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500
                         text-white text-sm font-medium hover:from-violet-500 hover:to-violet-400
                         transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              {isPending ? 'Creating…' : `Create ${willCreate.length > 0 ? willCreate.length + ' ' : ''}${unitLabel}${willCreate.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
