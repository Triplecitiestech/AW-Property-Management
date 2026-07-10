'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CONTACT_ROLES } from '@/lib/contact-roles'
import { createContactForProperties } from '@/lib/actions/contacts'

type Property = { id: string; name: string }
type PropertyAssignment = { propertyId: string; role: string; isPrimary: boolean }

function roleLabel(role: string) {
  return CONTACT_ROLES.find(r => r.value === role)?.label ?? role
}

export default function NewContactForm({ properties }: { properties: Property[] }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<PropertyAssignment[]>([
    { propertyId: properties[0]?.id ?? '', role: 'other', isPrimary: false },
  ])

  function addAssignment() {
    setAssignments(prev => [...prev, { propertyId: '', role: 'other', isPrimary: false }])
  }

  function removeAssignment(index: number) {
    setAssignments(prev => prev.filter((_, i) => i !== index))
  }

  function updateAssignment(index: number, field: keyof PropertyAssignment, value: string | boolean) {
    setAssignments(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const filled = assignments.filter(a => a.propertyId)
    if (filled.length === 0) {
      setError('Select at least one property.')
      return
    }

    const formData = new FormData(e.currentTarget)

    // Rebuild the property assignment fields from state (react-controlled)
    formData.delete('property_id')
    formData.delete('property_role')
    formData.delete('property_primary')
    for (const a of filled) {
      formData.append('property_id', a.propertyId)
      formData.append('property_role', a.role)
      formData.append('property_primary', a.isPrimary ? 'true' : 'false')
    }

    startTransition(async () => {
      const result = await createContactForProperties(formData)
      if (result && 'error' in result) setError(result.error)
    })
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/contacts" className="text-[#6480a0] hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1>Add Contact</h1>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Contact info (shared across all properties) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label" htmlFor="name">Name *</label>
              <input id="name" name="name" type="text" className="form-input" required placeholder="e.g. Jane Smith" />
            </div>
            <div>
              <label className="form-label" htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" className="form-input" placeholder="555-0100" />
            </div>
            <div>
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="form-input" placeholder="jane@example.com" />
            </div>
            <div className="col-span-2">
              <label className="form-label" htmlFor="notes">Notes</label>
              <input id="notes" name="notes" type="text" className="form-input" placeholder="Available Mon–Fri 8am–5pm" />
            </div>
          </div>

          {/* Property associations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Properties &amp; Roles *</label>
              <button
                type="button"
                onClick={addAssignment}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add another property
              </button>
            </div>

            <div className="space-y-2">
              {assignments.map((assignment, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-[#0f0f1a] rounded-xl border border-[#262638]">
                  <div className="flex-1 min-w-0">
                    <select
                      className="form-select text-sm mb-2"
                      value={assignment.propertyId}
                      onChange={e => updateAssignment(i, 'propertyId', e.target.value)}
                      required={i === 0}
                    >
                      <option value="">Select property…</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <select
                      className="form-select text-sm"
                      value={assignment.role}
                      onChange={e => updateAssignment(i, 'role', e.target.value)}
                    >
                      {CONTACT_ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <label className="flex flex-col items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-violet-500"
                        checked={assignment.isPrimary}
                        onChange={e => updateAssignment(i, 'isPrimary', e.target.checked)}
                      />
                      <span className="text-[10px] text-[#6480a0]">Primary</span>
                    </label>
                    {assignments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAssignment(i)}
                        className="text-[#6480a0] hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#4a6080] mt-2">
              Add one row per property. Each property can have a different role for this contact.
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Saving…' : 'Add Contact'}
            </button>
            <Link href="/contacts" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
