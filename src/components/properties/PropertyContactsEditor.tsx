'use client'

import { useState, useTransition } from 'react'
import { addContact, updateContact, deleteContact } from '@/lib/actions/contacts'
import { CONTACT_ROLES } from '@/lib/contact-roles'

type Contact = {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  notes: string | null
  is_primary: boolean
}

const ROLE_STYLES: Record<string, string> = {
  primary:     'bg-violet-950 text-violet-300 ring-1 ring-violet-700/50',
  maintenance: 'bg-orange-950 text-orange-300 ring-1 ring-orange-700/50',
  plumbing:    'bg-blue-950   text-blue-300   ring-1 ring-blue-700/50',
  hvac:        'bg-cyan-950   text-cyan-300   ring-1 ring-cyan-700/50',
  electrical:  'bg-amber-950  text-amber-300  ring-1 ring-amber-700/50',
  cleaning:    'bg-emerald-950 text-emerald-300 ring-1 ring-emerald-700/50',
  groceries:   'bg-green-950  text-green-300  ring-1 ring-green-700/50',
  other:       'bg-[#1a1a28]  text-[#60608a]  ring-1 ring-[#262638]',
}

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  CONTACT_ROLES.map(r => [r.value, r.label])
)

function ContactForm({
  propertyId,
  contact,
  onDone,
}: {
  propertyId: string
  contact?: Contact
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const isPrimary = (e.currentTarget.querySelector('[name="is_primary"]') as HTMLInputElement)?.checked
    formData.set('is_primary', isPrimary ? 'true' : 'false')

    startTransition(async () => {
      const result = contact
        ? await updateContact(contact.id, propertyId, formData)
        : await addContact(propertyId, formData)

      if (result?.error) {
        setError(result.error)
      } else {
        onDone()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-[#0f0f1a] rounded-xl border border-[#262638] space-y-3 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label text-xs">Name *</label>
          <input
            name="name"
            type="text"
            className="form-input text-sm"
            defaultValue={contact?.name ?? ''}
            placeholder="John Smith"
            required
          />
        </div>
        <div>
          <label className="form-label text-xs">Role</label>
          <select name="role" className="form-select text-sm" defaultValue={contact?.role ?? 'other'}>
            {CONTACT_ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label text-xs">Phone</label>
          <input
            name="phone"
            type="tel"
            className="form-input text-sm"
            defaultValue={contact?.phone ?? ''}
            placeholder="555-0100"
          />
        </div>
        <div>
          <label className="form-label text-xs">Email</label>
          <input
            name="email"
            type="email"
            className="form-input text-sm"
            defaultValue={contact?.email ?? ''}
            placeholder="contact@example.com"
          />
        </div>
      </div>
      <div>
        <label className="form-label text-xs">Notes</label>
        <input
          name="notes"
          type="text"
          className="form-input text-sm"
          defaultValue={contact?.notes ?? ''}
          placeholder="Available Mon–Fri 8am–5pm"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          name="is_primary"
          className="accent-violet-500"
          defaultChecked={contact?.is_primary ?? false}
        />
        <span className="text-xs text-[#8080aa]">Set as primary contact for this property</span>
      </label>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary text-xs">
          {isPending ? 'Saving…' : contact ? 'Update Contact' : 'Add Contact'}
        </button>
        <button type="button" onClick={onDone} className="btn-secondary text-xs">
          Cancel
        </button>
      </div>
    </form>
  )
}

function ContactCard({
  contact,
  propertyId,
  onEdit,
}: {
  contact: Contact
  propertyId: string
  onEdit: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Remove "${contact.name}" from contacts?`)) return
    startTransition(async () => {
      await deleteContact(contact.id, propertyId)
    })
  }

  return (
    <div className={`p-4 rounded-xl border transition-colors ${
      contact.is_primary
        ? 'border-violet-700/40 bg-violet-950/10'
        : 'border-[#22223a] bg-[#14141f]'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {contact.is_primary && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">★ Primary</span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[contact.role] ?? ROLE_STYLES.other}`}>
              {ROLE_LABELS[contact.role] ?? contact.role}
            </span>
          </div>
          <p className="font-semibold text-white text-sm">{contact.name}</p>
          <div className="mt-1.5 space-y-0.5">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-xs text-[#8080aa] hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs text-[#8080aa] hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {contact.email}
              </a>
            )}
            {contact.notes && (
              <p className="text-xs text-[#50507a] italic mt-1">{contact.notes}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-[#60608a] hover:text-white hover:bg-[#22223a] transition-colors"
            title="Edit contact"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="p-1.5 rounded-lg text-[#60608a] hover:text-red-400 hover:bg-red-950/30 transition-colors"
            title="Delete contact"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PropertyContactsEditor({
  propertyId,
  initialContacts,
}: {
  propertyId: string
  initialContacts: Contact[]
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  // Sort: primary first, then by sort_order
  const sorted = [...initialContacts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return 0
  })

  return (
    <div className="space-y-3">
      {sorted.length === 0 && !showAdd && (
        <p className="text-sm text-[#60608a] text-center py-4">
          No contacts added yet. Add your primary manager and service providers.
        </p>
      )}

      {sorted.map(contact => (
        <div key={contact.id}>
          {editingId === contact.id ? (
            <ContactForm
              propertyId={propertyId}
              contact={contact}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <ContactCard
              contact={contact}
              propertyId={propertyId}
              onEdit={() => { setEditingId(contact.id); setShowAdd(false) }}
            />
          )}
        </div>
      ))}

      {showAdd && (
        <ContactForm
          propertyId={propertyId}
          onDone={() => setShowAdd(false)}
        />
      )}

      {!showAdd && editingId === null && (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors py-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contact
        </button>
      )}
    </div>
  )
}
