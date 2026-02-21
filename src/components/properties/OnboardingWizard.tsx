'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { addContact } from '@/lib/actions/contacts'
import { saveChecklistItems } from '@/lib/actions/checklist'
import { updatePropertyNotes, updateAiInstructions } from '@/lib/actions/properties'
import { CONTACT_ROLES } from '@/lib/contact-roles'
import { DEFAULT_CHECKLIST_LABELS } from '@/lib/checklist-defaults'

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactDraft = {
  name: string
  role: string
  phone: string
  email: string
  notes: string
  is_primary: boolean
}

const EMPTY_CONTACT: ContactDraft = {
  name: '', role: 'primary', phone: '', email: '', notes: '', is_primary: false,
}

const STEPS = [
  { id: 'primary',   title: 'Primary Contact',     subtitle: 'Who manages this property?' },
  { id: 'services',  title: 'Service Contacts',     subtitle: 'Cleaning, maintenance, landscaping, and more' },
  { id: 'checklist', title: 'Cleaning Checklist',   subtitle: 'Items for your cleaning and inspection team' },
  { id: 'notes',     title: 'Notes & AI Instructions', subtitle: 'Context for you and the AI assistant' },
]

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i < current ? 'bg-violet-500' : i === current ? 'bg-violet-400' : 'bg-[#262638]'
          }`}
        />
      ))}
      <span className="text-xs text-[#60608a] ml-1 flex-shrink-0">
        {current + 1} / {total}
      </span>
    </div>
  )
}

// ─── Step: Primary Contact ─────────────────────────────────────────────────────

function PrimaryContactStep({
  propertyId,
  onNext,
  onSkip,
}: {
  propertyId: string
  onNext: () => void
  onSkip: () => void
}) {
  const [form, setForm] = useState<ContactDraft>({ ...EMPTY_CONTACT, role: 'primary', is_primary: true })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function set(field: keyof ContactDraft, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('name', form.name)
      fd.set('role', form.role)
      fd.set('phone', form.phone)
      fd.set('email', form.email)
      fd.set('notes', form.notes)
      fd.set('is_primary', 'true')
      const result = await addContact(propertyId, fd)
      if (result?.error) { setError(result.error) } else { onNext() }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="form-label text-xs">Full Name *</label>
          <input
            type="text"
            className="form-input text-sm"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="form-label text-xs">Role</label>
          <select className="form-select text-sm" value={form.role} onChange={e => set('role', e.target.value)}>
            {CONTACT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label text-xs">Phone</label>
          <input
            type="tel"
            className="form-input text-sm"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="555-0100"
          />
        </div>
        <div>
          <label className="form-label text-xs">Email</label>
          <input
            type="email"
            className="form-input text-sm"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="manager@example.com"
          />
        </div>
      </div>
      <div>
        <label className="form-label text-xs">Notes (availability, preferences…)</label>
        <input
          type="text"
          className="form-input text-sm"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Available Mon–Fri 8am–5pm"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <StepButtons onSave={handleSave} onSkip={onSkip} isPending={isPending} saveLabel="Save & Continue" />
    </div>
  )
}

// ─── Step: Service Contacts ───────────────────────────────────────────────────

function ServiceContactsStep({
  propertyId,
  onNext,
  onSkip,
}: {
  propertyId: string
  onNext: () => void
  onSkip: () => void
}) {
  const [contacts, setContacts] = useState<ContactDraft[]>([{ ...EMPTY_CONTACT, role: 'cleaning' }])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function addRow() {
    setContacts(prev => [...prev, { ...EMPTY_CONTACT, role: 'maintenance' }])
  }

  function removeRow(i: number) {
    setContacts(prev => prev.filter((_, idx) => idx !== i))
  }

  function setField(i: number, field: keyof ContactDraft, value: string | boolean) {
    setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  function handleSave() {
    const filled = contacts.filter(c => c.name.trim())
    if (filled.length === 0) { onNext(); return }
    setError(null)
    startTransition(async () => {
      for (const c of filled) {
        const fd = new FormData()
        fd.set('name', c.name)
        fd.set('role', c.role)
        fd.set('phone', c.phone)
        fd.set('email', c.email)
        fd.set('notes', c.notes)
        fd.set('is_primary', 'false')
        const result = await addContact(propertyId, fd)
        if (result?.error) { setError(result.error); return }
      }
      setSaved(true)
      setTimeout(onNext, 600)
    })
  }

  return (
    <div className="space-y-4">
      {contacts.map((c, i) => (
        <div key={i} className="p-4 rounded-xl border border-[#262638] bg-[#0f0f1a] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#60608a] font-medium">Contact #{i + 1}</span>
            {contacts.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Name</label>
              <input
                type="text"
                className="form-input text-sm"
                value={c.name}
                onChange={e => setField(i, 'name', e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="form-label text-xs">Role</label>
              <select
                className="form-select text-sm"
                value={c.role}
                onChange={e => setField(i, 'role', e.target.value)}
              >
                {CONTACT_ROLES.filter(r => r.value !== 'primary').map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Phone</label>
              <input
                type="tel"
                className="form-input text-sm"
                value={c.phone}
                onChange={e => setField(i, 'phone', e.target.value)}
                placeholder="555-0100"
              />
            </div>
            <div>
              <label className="form-label text-xs">Email</label>
              <input
                type="email"
                className="form-input text-sm"
                value={c.email}
                onChange={e => setField(i, 'email', e.target.value)}
                placeholder="cleaner@example.com"
              />
            </div>
          </div>
          <div>
            <label className="form-label text-xs">Notes</label>
            <input
              type="text"
              className="form-input text-sm"
              value={c.notes}
              onChange={e => setField(i, 'notes', e.target.value)}
              placeholder="Rate, scheduling notes, etc."
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add another contact
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {saved && <p className="text-xs text-emerald-400">Contacts saved!</p>}
      <StepButtons onSave={handleSave} onSkip={onSkip} isPending={isPending} saveLabel="Save & Continue" />
    </div>
  )
}

// ─── Step: Checklist ──────────────────────────────────────────────────────────

function ChecklistStep({
  propertyId,
  initialChecklist,
  onNext,
  onSkip,
}: {
  propertyId: string
  initialChecklist: string[]
  onNext: () => void
  onSkip: () => void
}) {
  const [items, setItems] = useState<string[]>(
    initialChecklist.length > 0 ? initialChecklist : DEFAULT_CHECKLIST_LABELS
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function addItem() { setItems(prev => [...prev, '']) }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, v: string) { setItems(prev => prev.map((it, idx) => idx === i ? v : it)) }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await saveChecklistItems(propertyId, items.filter(Boolean))
      if (result?.error) { setError(result.error) } else { onNext() }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#8080aa]">
        These items appear on the cleaning / inspection checklist for this property.
        Edit, reorder, or remove any that don&apos;t apply.
      </p>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[#60608a] text-xs w-5 text-right flex-shrink-0">{i + 1}.</span>
            <input
              type="text"
              className="form-input text-sm flex-1"
              value={item}
              onChange={e => updateItem(i, e.target.value)}
              placeholder="Checklist item…"
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="text-[#60608a] hover:text-red-400 transition-colors p-1"
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
        className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add item
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <StepButtons onSave={handleSave} onSkip={onSkip} isPending={isPending} saveLabel="Save & Continue" />
    </div>
  )
}

// ─── Step: Notes & AI Instructions ────────────────────────────────────────────

function NotesStep({
  propertyId,
  initialNotes,
  initialAiInstructions,
  onNext,
  onSkip,
}: {
  propertyId: string
  initialNotes: string
  initialAiInstructions: string
  onNext: () => void
  onSkip: () => void
}) {
  const [notes, setNotes] = useState(initialNotes)
  const [ai, setAi] = useState(initialAiInstructions)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const [r1, r2] = await Promise.all([
        updatePropertyNotes(propertyId, notes),
        updateAiInstructions(propertyId, ai),
      ])
      if (r1?.error) { setError(r1.error); return }
      if (r2?.error) { setError(r2.error); return }
      onNext()
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="form-label text-xs">Quick Notes / Overview</label>
        <p className="text-[11px] text-[#60608a] mb-1.5">
          Anything the team should know: check-in/out times, parking, pet policy, house rules, access codes, etc.
        </p>
        <textarea
          className="form-input text-sm"
          rows={5}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={`Check-in: 3pm / Check-out: 11am\nParking: 2-car garage, code 1234\nPets: small dogs allowed\nTrash day: Tuesday`}
        />
      </div>
      <div>
        <label className="form-label text-xs">AI Agent Instructions</label>
        <p className="text-[11px] text-[#60608a] mb-1.5">
          Context for the AI assistant when handling guest messages, tickets, or scheduling for this property.
        </p>
        <textarea
          className="form-input text-sm"
          rows={4}
          value={ai}
          onChange={e => setAi(e.target.value)}
          placeholder="This is a 3-bedroom cabin near the lake. Prioritize quick responses for plumbing issues. The cleaning team (Maria) needs 4 hours between stays."
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <StepButtons onSave={handleSave} onSkip={onSkip} isPending={isPending} saveLabel="Finish Setup" />
    </div>
  )
}

// ─── Shared Buttons ───────────────────────────────────────────────────────────

function StepButtons({
  onSave,
  onSkip,
  isPending,
  saveLabel,
}: {
  onSave: () => void
  onSkip: () => void
  isPending: boolean
  saveLabel: string
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <button
        type="button"
        onClick={onSkip}
        className="text-sm text-[#60608a] hover:text-white transition-colors"
        disabled={isPending}
      >
        Skip this step →
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        className="btn-primary text-sm"
      >
        {isPending ? 'Saving…' : saveLabel}
      </button>
    </div>
  )
}

// ─── Done Screen ──────────────────────────────────────────────────────────────

function DoneScreen({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  return (
    <div className="text-center py-10 space-y-4">
      <div className="w-14 h-14 bg-emerald-950 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-700/40">
        <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">{propertyName} is set up!</h2>
        <p className="text-sm text-[#8080aa] mt-1">
          You can always update contacts, the checklist, and notes from the property page.
        </p>
      </div>
      <Link
        href={`/properties/${propertyId}`}
        className="btn-primary inline-flex mx-auto"
      >
        Go to Property →
      </Link>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function OnboardingWizard({
  propertyId,
  propertyName,
  initialChecklist,
  initialNotes,
  initialAiInstructions,
}: {
  propertyId: string
  propertyName: string
  initialChecklist: string[]
  initialNotes: string
  initialAiInstructions: string
}) {
  const [step, setStep] = useState(0)
  const done = step >= STEPS.length

  const next = () => setStep(s => s + 1)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href={`/properties/${propertyId}`}
            className="text-[#60608a] hover:text-white text-sm transition-colors"
          >
            ← {propertyName}
          </Link>
        </div>
        <h1 className="text-xl font-bold text-white">Property Onboarding</h1>
        <p className="text-sm text-[#8080aa] mt-0.5">
          Set up contacts, checklist, and notes for this property. Every step is optional — skip anything you&apos;d like to fill in later.
        </p>
      </div>

      <div className="card p-6">
        {done ? (
          <DoneScreen propertyId={propertyId} propertyName={propertyName} />
        ) : (
          <>
            <StepIndicator current={step} total={STEPS.length} />

            <div className="mb-5">
              <h2 className="text-base font-semibold text-white">{STEPS[step].title}</h2>
              <p className="text-xs text-[#8080aa] mt-0.5">{STEPS[step].subtitle}</p>
            </div>

            {step === 0 && (
              <PrimaryContactStep propertyId={propertyId} onNext={next} onSkip={next} />
            )}
            {step === 1 && (
              <ServiceContactsStep propertyId={propertyId} onNext={next} onSkip={next} />
            )}
            {step === 2 && (
              <ChecklistStep
                propertyId={propertyId}
                initialChecklist={initialChecklist}
                onNext={next}
                onSkip={next}
              />
            )}
            {step === 3 && (
              <NotesStep
                propertyId={propertyId}
                initialNotes={initialNotes}
                initialAiInstructions={initialAiInstructions}
                onNext={next}
                onSkip={next}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
