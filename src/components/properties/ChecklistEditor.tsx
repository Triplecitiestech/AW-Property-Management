'use client'

import { useState, useTransition } from 'react'
import { saveChecklistItems, resetChecklistToDefaults } from '@/lib/actions/checklist'
import { DEFAULT_CHECKLIST_LABELS } from '@/lib/checklist-defaults'

export default function ChecklistEditor({
  propertyId,
  initialItems,
}: {
  propertyId: string
  initialItems: string[]
}) {
  const defaultItems = initialItems.length > 0 ? initialItems : DEFAULT_CHECKLIST_LABELS
  const [items, setItems] = useState<string[]>(defaultItems)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function addItem() {
    setItems(prev => [...prev, ''])
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, value: string) {
    setItems(prev => prev.map((item, i) => (i === index ? value : item)))
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await saveChecklistItems(propertyId, items.filter(Boolean))
      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  function handleReset() {
    setError(null)
    startTransition(async () => {
      const result = await resetChecklistToDefaults(propertyId)
      if (result?.error) {
        setError(result.error)
      } else {
        setItems(DEFAULT_CHECKLIST_LABELS)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-gray-400 text-xs w-5 text-right">{index + 1}.</span>
            <input
              type="text"
              className="form-input text-sm flex-1"
              value={item}
              onChange={e => updateItem(index, e.target.value)}
              placeholder="Checklist item..."
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
              aria-label="Remove item"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add item
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={isPending} className="btn-primary text-sm">
          {isPending ? 'Saving...' : saved ? 'Saved!' : 'Save Checklist'}
        </button>
        <button onClick={handleReset} disabled={isPending} className="btn-secondary text-sm">
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
