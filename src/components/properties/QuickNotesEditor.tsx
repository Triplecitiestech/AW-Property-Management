'use client'

import { useState, useTransition } from 'react'
import { updatePropertyNotes } from '@/lib/actions/properties'

export default function QuickNotesEditor({
  propertyId,
  initialNotes,
}: {
  propertyId: string
  initialNotes: string
}) {
  const [notes, setNotes] = useState(initialNotes)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updatePropertyNotes(propertyId, notes)
      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="space-y-3">
      <textarea
        className="form-input text-sm resize-none"
        rows={4}
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Add overview notes for this property — key details, access instructions, quirks, reminders, etc."
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={isPending} className="btn-primary text-sm">
          {isPending ? 'Saving…' : saved ? 'Saved!' : 'Save Notes'}
        </button>
        {saved && <span className="text-xs text-emerald-400">Changes saved</span>}
      </div>
    </div>
  )
}
