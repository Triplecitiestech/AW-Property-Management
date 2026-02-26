'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createTicket } from '@/lib/actions/tickets'
import { CONTACT_ROLES } from '@/lib/contact-roles'

type Property = { id: string; name: string }
type Manager = { id: string; full_name: string }
type Contact = { id: string; property_id: string; name: string; role: string; email: string | null; phone: string | null }

function roleLabel(role: string) {
  return CONTACT_ROLES.find(r => r.value === role)?.label ?? role
}

export default function NewWorkOrderForm({
  properties,
  managers,
  allContacts,
  defaultPropertyId,
  tomorrowStr,
}: {
  properties: Property[]
  managers: Manager[]
  allContacts: Contact[]
  defaultPropertyId: string
  tomorrowStr: string
}) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(defaultPropertyId)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const propertyContacts = allContacts.filter(c => c.property_id === selectedPropertyId)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createTicket(formData)
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/work-orders" className="text-[#6480a0] hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1>New Work Order</h1>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label" htmlFor="property_id">Property *</label>
            <select
              id="property_id"
              name="property_id"
              className="form-select"
              required
              value={selectedPropertyId}
              onChange={e => setSelectedPropertyId(e.target.value)}
            >
              <option value="" disabled>Select a property</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="title">Title *</label>
            <input id="title" name="title" type="text" className="form-input" required placeholder="e.g. Sink is leaking in master bathroom" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="category">Category</label>
              <select id="category" name="category" className="form-select">
                <option value="maintenance">Maintenance</option>
                <option value="cleaning">Cleaning</option>
                <option value="supplies">Supplies</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="priority">Priority</label>
              <select id="priority" name="priority" className="form-select" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="due_date">Due Date</label>
              <input id="due_date" name="due_date" type="date" className="form-input" defaultValue={tomorrowStr} />
            </div>
            <div>
              <label className="form-label" htmlFor="assignee_id">Assign To (Team)</label>
              <select id="assignee_id" name="assignee_id" className="form-select">
                <option value="">Unassigned</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          </div>

          {/* Contact Assignment */}
          <div>
            <label className="form-label" htmlFor="assigned_contact_id">
              Send To Contact
              <span className="ml-1 text-[#6480a0] font-normal">(AI will auto-assign if left blank)</span>
            </label>
            <select id="assigned_contact_id" name="assigned_contact_id" className="form-select">
              <option value="">Auto-assign with AI</option>
              {propertyContacts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {roleLabel(c.role)}{c.email ? '' : ' (no email)'}
                </option>
              ))}
            </select>
            {selectedPropertyId && propertyContacts.length === 0 && (
              <p className="text-xs text-[#6480a0] mt-1">No contacts for this property yet. Add them from the property page.</p>
            )}
          </div>

          <div>
            <label className="form-label" htmlFor="description">Description</label>
            <textarea id="description" name="description" className="form-input" rows={4} placeholder="Describe the issue in detail..." />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Creating…' : 'Create Work Order'}
            </button>
            <Link href="/work-orders" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
