'use client'

import { useState, useTransition } from 'react'
import { updateFeatureRequestStatus } from '@/lib/actions/admin'

type Request = {
  id: string
  title: string
  description?: string | null
  status: string
  votes: number
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-sky-900/40 text-sky-400 border-sky-800/40',
  reviewing: 'bg-blue-900/40 text-blue-400 border-blue-800/40',
  planned: 'bg-violet-900/40 text-violet-400 border-violet-800/40',
  done: 'bg-emerald-900/40 text-emerald-400 border-emerald-800/40',
  declined: 'bg-red-900/40 text-red-400 border-red-800/40',
}

export default function FeatureRequestAdmin({ requests }: { requests: Request[] }) {
  const [isPending, startTransition] = useTransition()

  if (requests.length === 0) {
    return <p className="text-sm text-[#6480a0]">No feature requests yet.</p>
  }

  return (
    <div className="space-y-3">
      {requests.map(r => (
        <div key={r.id} className="flex items-start justify-between gap-4 p-4 bg-[#0f1829] rounded-xl border border-[#1e2d42]">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white text-sm">{r.title}</p>
            {r.description && <p className="text-xs text-[#6480a0] mt-0.5">{r.description}</p>}
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status] ?? STATUS_COLORS.pending}`}>
                {r.status}
              </span>
              <span className="text-xs text-[#6480a0]">👍 {r.votes}</span>
              <span className="text-xs text-[#6480a0]">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <select
            defaultValue={r.status}
            disabled={isPending}
            onChange={e => startTransition(() => updateFeatureRequestStatus(r.id, e.target.value))}
            className="bg-[#1a2436] border border-[#2a3d58] text-sm text-white rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-500"
          >
            {['pending', 'reviewing', 'planned', 'done', 'declined'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
