'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { saveChecklistItems, resetChecklistToDefaults, toggleChecklistItem, resetChecklistChecks } from '@/lib/actions/checklist'
import { DEFAULT_CHECKLIST_LABELS } from '@/lib/checklist-defaults'

type ChecklistItem = { id: string; label: string; is_checked: boolean }

export default function ChecklistEditor({
  propertyId,
  initialItems,
}: {
  propertyId: string
  initialItems: ChecklistItem[]
}) {
  const defaultItems: ChecklistItem[] = initialItems.length > 0
    ? initialItems
    : DEFAULT_CHECKLIST_LABELS.map((label, i) => ({ id: `default-${i}`, label, is_checked: false }))

  const [mode, setMode] = useState<'check' | 'edit'>('check')
  const [editLabels, setEditLabels] = useState<string[]>(defaultItems.map(i => i.label))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Optimistic checked state for instant UI feedback
  const [optimisticItems, setOptimisticItems] = useOptimistic(defaultItems)

  function handleToggle(item: ChecklistItem) {
    startTransition(async () => {
      setOptimisticItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, is_checked: !i.is_checked } : i)
      )
      await toggleChecklistItem(item.id, !item.is_checked)
    })
  }

  function handleResetChecks() {
    startTransition(async () => {
      setOptimisticItems(prev => prev.map(i => ({ ...i, is_checked: false })))
      await resetChecklistChecks(propertyId)
    })
  }

  function handleSaveEdit() {
    setError(null)
    startTransition(async () => {
      const result = await saveChecklistItems(propertyId, editLabels.filter(Boolean))
      if (result?.error) { setError(result.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      setMode('check')
    })
  }

  function handleResetDefaults() {
    setError(null)
    startTransition(async () => {
      const result = await resetChecklistToDefaults(propertyId)
      if (result?.error) { setError(result.error); return }
      setEditLabels(DEFAULT_CHECKLIST_LABELS)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  // Sort: unchecked first, checked last
  const sorted = [...optimisticItems].sort((a, b) => {
    if (a.is_checked === b.is_checked) return 0
    return a.is_checked ? 1 : -1
  })
  const checkedCount = optimisticItems.filter(i => i.is_checked).length

  if (mode === 'check') {
    return (
      <div className="space-y-3">
        {sorted.length === 0 && (
          <p className="text-xs text-[#6480a0]">No checklist items. Click Edit to add some.</p>
        )}
        <div className="space-y-1.5">
          {sorted.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => !item.id.startsWith('default-') && handleToggle(item)}
              disabled={item.id.startsWith('default-') || isPending}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                ${item.is_checked
                  ? 'bg-[#0f1829] opacity-50'
                  : 'bg-[#1a2436] hover:bg-[#1e2d42]'
                } ${item.id.startsWith('default-') ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-all
                ${item.is_checked
                  ? 'bg-teal-500 border-teal-500'
                  : 'border-[#3a4d60] bg-transparent'
                }`}>
                {item.is_checked && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm flex-1 ${item.is_checked ? 'line-through text-[#6480a0]' : 'text-[#cbd5e1]'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-2">
            {checkedCount > 0 && (
              <button onClick={handleResetChecks} disabled={isPending}
                      className="text-xs text-[#6480a0] hover:text-white border border-[#2a3d58] hover:border-[#4a5d70]
                                 px-3 py-1.5 rounded-lg transition-all">
                Reset ({checkedCount})
              </button>
            )}
          </div>
          <button onClick={() => setMode('edit')}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Edit checklist →
          </button>
        </div>
      </div>
    )
  }

  // Edit mode
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {editLabels.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-[#6480a0] text-xs w-5 text-right">{index + 1}.</span>
            <input
              type="text"
              className="form-input text-sm flex-1"
              value={item}
              onChange={e => setEditLabels(prev => prev.map((v, i) => i === index ? e.target.value : v))}
              placeholder="Checklist item…"
            />
            <button type="button" onClick={() => setEditLabels(prev => prev.filter((_, i) => i !== index))}
                    className="text-[#6480a0] hover:text-red-400 transition-colors p-1 rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setEditLabels(prev => [...prev, ''])}
              className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add item
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSaveEdit} disabled={isPending} className="btn-primary text-sm">
          {isPending ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
        <button onClick={handleResetDefaults} disabled={isPending} className="btn-secondary text-sm">
          Reset to Defaults
        </button>
        <button onClick={() => setMode('check')} className="btn-secondary text-sm ml-auto">
          ← Back
        </button>
      </div>
    </div>
  )
}
