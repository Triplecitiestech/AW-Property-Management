'use client'

import { useState, useTransition } from 'react'
import { updatePropertyStatus } from '@/lib/actions/properties'
import type { PropertyStatusEnum, OccupancyEnum } from '@/lib/supabase/types'

const STATUS_OPTIONS: { value: PropertyStatusEnum; label: string }[] = [
  { value: 'clean', label: 'Clean' },
  { value: 'needs_cleaning', label: 'Needs Cleaning' },
  { value: 'needs_maintenance', label: 'Needs Maintenance' },
  { value: 'needs_groceries', label: 'Needs Groceries' },
]

const OCCUPANCY_OPTIONS: { value: OccupancyEnum; label: string }[] = [
  { value: 'unoccupied', label: 'Unoccupied' },
  { value: 'occupied', label: 'Occupied' },
]

export default function PropertyStatusWidget({
  propertyId,
  currentStatus,
  currentOccupancy,
  currentNotes,
}: {
  propertyId: string
  currentStatus: PropertyStatusEnum
  currentOccupancy: OccupancyEnum
  currentNotes: string
}) {
  const [status, setStatus] = useState<PropertyStatusEnum>(currentStatus)
  const [occupancy, setOccupancy] = useState<OccupancyEnum>(currentOccupancy)
  const [notes, setNotes] = useState(currentNotes)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updatePropertyStatus(propertyId, status, occupancy, notes)
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
      <div>
        <label className="form-label text-xs">Cleanliness Status</label>
        <select
          className="form-select text-sm"
          value={status}
          onChange={e => setStatus(e.target.value as PropertyStatusEnum)}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label text-xs">Occupancy</label>
        <select
          className="form-select text-sm"
          value={occupancy}
          onChange={e => setOccupancy(e.target.value as OccupancyEnum)}
        >
          {OCCUPANCY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label text-xs">Notes (optional)</label>
        <textarea
          className="form-input text-sm"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any notes about current state..."
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={isPending}
        className="btn-primary text-sm w-full justify-center"
      >
        {isPending ? 'Saving...' : saved ? 'Saved!' : 'Update Status'}
      </button>
    </div>
  )
}
