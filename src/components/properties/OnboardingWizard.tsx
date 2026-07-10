'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { addContact } from '@/lib/actions/contacts'
import { saveChecklistItems } from '@/lib/actions/checklist'
import {
  createPropertyForWizard,
  updateProperty,
  updatePropertyNotes,
  updateAiInstructions,
  updatePropertyAccess,
} from '@/lib/actions/properties'
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
  { id: 'details',   title: 'Property Details',        subtitle: 'Name, address, and property information' },
  { id: 'access',    title: 'Guest Access Info',        subtitle: 'WiFi, door codes, check-in times — shared with guests & tenants' },
  { id: 'primary',   title: 'Primary Contact',          subtitle: 'Who manages this property?' },
  { id: 'services',  title: 'Service Contacts',          subtitle: 'Cleaning, maintenance, landscaping, and more' },
  { id: 'checklist', title: 'Cleaning Checklist',        subtitle: 'Items for your cleaning and inspection team' },
  { id: 'notes',     title: 'Notes & AI Instructions',   subtitle: 'Context for you and the AI assistant' },
]

// ─── Shared Step Buttons ──────────────────────────────────────────────────────

function StepButtons({
  onSave,
  onSkip,
  isPending,
  saveLabel,
}: {
  onSave: () => void
  onSkip?: () => void
  isPending: boolean
  saveLabel: string
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-[#60608a] hover:text-white transition-colors"
          disabled={isPending}
        >
          Skip this step →
        </button>
      ) : <div />}
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

// ─── Progress Indicator ───────────────────────────────────────────────────────

function StepIndicator({
  current,
  total,
  maxReached,
  onStepClick,
}: {
  current: number
  total: number
  maxReached: number
  onStepClick: (step: number) => void
}) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => {
        const clickable = i <= maxReached && i !== current
        return (
          <div
            key={i}
            onClick={clickable ? () => onStepClick(i) : undefined}
            title={clickable ? STEPS[i].title : undefined}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < current ? 'bg-violet-500' : i === current ? 'bg-violet-400' : 'bg-[#262638]'
            } ${clickable ? 'cursor-pointer hover:opacity-70' : ''}`}
          />
        )
      })}
      <span className="text-xs text-[#60608a] ml-1 flex-shrink-0">
        {current + 1} / {total}
      </span>
    </div>
  )
}

// ─── Step 0: Property Details ─────────────────────────────────────────────────

function buildDescription(
  bedrooms: string,
  bathrooms: string,
  maxGuests: string,
  wifiName: string,
  wifiPass: string,
  amenities: string,
  extra: string,
): string {
  const parts: string[] = []
  const specs = [
    bedrooms && `${bedrooms} bed`,
    bathrooms && `${bathrooms} bath`,
    maxGuests && `Max ${maxGuests} guests`,
  ].filter(Boolean)
  if (specs.length) parts.push(specs.join(' · '))
  if (wifiName || wifiPass) {
    parts.push(`WiFi: ${[wifiName, wifiPass].filter(Boolean).join(' / ')}`)
  }
  if (amenities.trim()) parts.push(`Amenities: ${amenities.trim()}`)
  if (extra.trim()) parts.push(extra.trim())
  return parts.join('\n\n')
}

function PropertyDetailsStep({
  isNew,
  propertyId,
  initialName = '',
  initialAddress = '',
  initialDescription = '',
  initialPropertyType = 'single_family',
  onSave,
  onSkip,
}: {
  isNew: boolean
  propertyId?: string
  initialName?: string
  initialAddress?: string
  initialDescription?: string
  initialPropertyType?: string
  onSave: (propertyId: string, name: string, propertyType: string) => void
  onSkip?: () => void
}) {
  const [name, setName] = useState(initialName)
  const [address, setAddress] = useState(initialAddress)
  const [propertyType, setPropertyType] = useState(initialPropertyType)

  // Create mode: structured property info fields
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  const [wifiName, setWifiName] = useState('')
  const [wifiPass, setWifiPass] = useState('')
  const [amenities, setAmenities] = useState('')
  const [extra, setExtra] = useState('')

  // Edit mode: full-text description
  const [description, setDescription] = useState(initialDescription)

  const [aiSummary, setAiSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function fetchAiSummary() {
    if (!address && !name) return
    setSummaryLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/property-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address }),
      })
      const data = await res.json()
      if (data.error && !data.summary) {
        setError(`AI summary unavailable: ${data.error}`)
      } else if (data.summary) {
        setAiSummary(data.summary)
      }
    } catch {
      setError('Failed to generate AI summary. Check your API key configuration.')
    } finally {
      setSummaryLoading(false)
    }
  }

  function handleSave() {
    if (!name.trim()) { setError('Property name is required.'); return }
    setError(null)
    startTransition(async () => {
      if (isNew) {
        const desc = buildDescription(bedrooms, bathrooms, maxGuests, wifiName, wifiPass, amenities, extra)
        const result = await createPropertyForWizard(name, address, desc || null, propertyType as 'single_family' | 'apartment_building' | 'hospitality')
        if ('error' in result) { setError(result.error); return }
        // Save AI summary if generated
        if (aiSummary) {
          await fetch('/api/property-summary', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId: result.propertyId, summary: aiSummary }),
          }).catch(() => {})
        }
        onSave(result.propertyId, name.trim(), propertyType)
      } else {
        const fd = new FormData()
        fd.set('name', name)
        fd.set('address', address)
        fd.set('description', description)
        const result = await updateProperty(propertyId!, fd)
        if (result?.error) { setError(result.error); return }
        onSave(propertyId!, name.trim(), propertyType)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Name + Address — always shown */}
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="form-label text-xs">Property Name *</label>
          <input
            type="text"
            className="form-input text-sm"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Lake Cabin, Downtown Suite…"
            autoFocus
          />
        </div>
        <div>
          <label className="form-label text-xs">Address</label>
          <input
            type="text"
            className="form-input text-sm"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="123 Main St, City, State ZIP"
          />
        </div>
        <div>
          <label className="form-label text-xs">Property Type</label>
          <select
            className="form-select text-sm"
            value={propertyType}
            onChange={e => setPropertyType(e.target.value)}
          >
            <option value="single_family">Single Family / Vacation Rental</option>
            <option value="apartment_building">Apartment Building (Multi-Unit)</option>
            <option value="hospitality">Hotel / Hospitality</option>
          </select>
          {propertyType !== 'single_family' && (
            <p className="text-[11px] text-[#6480a0] mt-1">
              You can add and manage individual units from the property page after creation.
            </p>
          )}
        </div>
      </div>

      {/* AI Property Summary */}
      {(name || address) && (
        <div className="rounded-xl border border-[#2a3d58] bg-[#0f1829] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="form-label text-xs mb-0">AI Property Summary</label>
            <button
              type="button"
              onClick={fetchAiSummary}
              disabled={summaryLoading}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
            >
              {summaryLoading ? 'Generating…' : aiSummary ? 'Regenerate' : '✨ Generate'}
            </button>
          </div>
          <textarea
            className="form-input text-sm w-full resize-none"
            rows={3}
            value={aiSummary}
            onChange={e => setAiSummary(e.target.value)}
            placeholder="Click Generate to get an AI-powered property description…"
          />
        </div>
      )}

      {isNew ? (
        /* Create mode: structured fields */
        <>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label text-xs">Bedrooms</label>
              <input
                type="number"
                min="0"
                className="form-input text-sm"
                value={bedrooms}
                onChange={e => setBedrooms(e.target.value)}
                placeholder="3"
              />
            </div>
            <div>
              <label className="form-label text-xs">Bathrooms</label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="form-input text-sm"
                value={bathrooms}
                onChange={e => setBathrooms(e.target.value)}
                placeholder="2"
              />
            </div>
            <div>
              <label className="form-label text-xs">Max Guests</label>
              <input
                type="number"
                min="1"
                className="form-input text-sm"
                value={maxGuests}
                onChange={e => setMaxGuests(e.target.value)}
                placeholder="6"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">WiFi Network</label>
              <input
                type="text"
                className="form-input text-sm"
                value={wifiName}
                onChange={e => setWifiName(e.target.value)}
                placeholder="HomeNetwork"
              />
            </div>
            <div>
              <label className="form-label text-xs">WiFi Password</label>
              <input
                type="text"
                className="form-input text-sm"
                value={wifiPass}
                onChange={e => setWifiPass(e.target.value)}
                placeholder="password123"
              />
            </div>
          </div>

          <div>
            <label className="form-label text-xs">Amenities</label>
            <input
              type="text"
              className="form-input text-sm"
              value={amenities}
              onChange={e => setAmenities(e.target.value)}
              placeholder="Pool, hot tub, fire pit, BBQ, kayaks…"
            />
          </div>

          <div>
            <label className="form-label text-xs">Additional Details</label>
            <textarea
              className="form-input text-sm"
              rows={3}
              value={extra}
              onChange={e => setExtra(e.target.value)}
              placeholder="Anything else worth noting — style, location, unique features, parking…"
            />
          </div>
        </>
      ) : (
        /* Edit mode: single description textarea (preserves existing content) */
        <div>
          <label className="form-label text-xs">Property Description</label>
          <p className="text-[11px] text-[#60608a] mb-1.5">
            Bedrooms, bathrooms, WiFi, amenities, and anything else relevant about this property.
          </p>
          <textarea
            className="form-input text-sm"
            rows={6}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={`3 bed · 2 bath · Max 6 guests\nWiFi: HomeNetwork / pass123\nAmenities: Pool, hot tub, fire pit`}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
      <StepButtons
        onSave={handleSave}
        onSkip={onSkip}
        isPending={isPending}
        saveLabel={isNew ? 'Create Property' : 'Save & Continue'}
      />
    </div>
  )
}

// ─── Step 1: Guest Access Info ────────────────────────────────────────────────

function GuestAccessStep({
  propertyId,
  onNext,
  onSkip,
}: {
  propertyId: string
  onNext: () => void
  onSkip: () => void
}) {
  const [wifiName, setWifiName] = useState('')
  const [wifiPass, setWifiPass] = useState('')
  const [doorCode, setDoorCode] = useState('')
  const [gateCode, setGateCode] = useState('')
  const [parkingInfo, setParkingInfo] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [trashSchedule, setTrashSchedule] = useState('')
  const [houseRules, setHouseRules] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updatePropertyAccess(propertyId, {
        wifi_name: wifiName,
        wifi_password: wifiPass,
        door_code: doorCode,
        gate_code: gateCode,
        parking_info: parkingInfo,
        check_in_time: checkIn,
        check_out_time: checkOut,
        trash_schedule: trashSchedule,
        house_rules: houseRules,
      })
      if (result?.error) { setError(result.error) } else { onNext() }
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#8080aa]">
        This info is auto-shared with guests and tenants when you invite them. You can update it any time from the property page.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label text-xs">WiFi Network</label>
          <input type="text" className="form-input text-sm" value={wifiName} onChange={e => setWifiName(e.target.value)} placeholder="HomeNetwork_5G" />
        </div>
        <div>
          <label className="form-label text-xs">WiFi Password</label>
          <input type="text" className="form-input text-sm" value={wifiPass} onChange={e => setWifiPass(e.target.value)} placeholder="password123" />
        </div>
        <div>
          <label className="form-label text-xs">Door / Lock Code</label>
          <input type="text" className="form-input text-sm" value={doorCode} onChange={e => setDoorCode(e.target.value)} placeholder="1234" />
        </div>
        <div>
          <label className="form-label text-xs">Gate Code</label>
          <input type="text" className="form-input text-sm" value={gateCode} onChange={e => setGateCode(e.target.value)} placeholder="5678 (if applicable)" />
        </div>
        <div>
          <label className="form-label text-xs">Check-in Time</label>
          <input type="text" className="form-input text-sm" value={checkIn} onChange={e => setCheckIn(e.target.value)} placeholder="3:00 PM" />
        </div>
        <div>
          <label className="form-label text-xs">Check-out Time</label>
          <input type="text" className="form-input text-sm" value={checkOut} onChange={e => setCheckOut(e.target.value)} placeholder="11:00 AM" />
        </div>
      </div>

      <div>
        <label className="form-label text-xs">Parking Info</label>
        <input type="text" className="form-input text-sm" value={parkingInfo} onChange={e => setParkingInfo(e.target.value)} placeholder="2-car garage, code 9876. Street parking after 6pm." />
      </div>

      <div>
        <label className="form-label text-xs">Trash Schedule</label>
        <input type="text" className="form-input text-sm" value={trashSchedule} onChange={e => setTrashSchedule(e.target.value)} placeholder="Trash: Tuesday 7am. Recycling: every other week." />
      </div>

      <div>
        <label className="form-label text-xs">House Rules</label>
        <textarea className="form-input text-sm" rows={3} value={houseRules} onChange={e => setHouseRules(e.target.value)}
          placeholder="No smoking inside. No parties. Pets allowed in backyard only. Quiet hours after 10pm." />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      <StepButtons onSave={handleSave} onSkip={onSkip} isPending={isPending} saveLabel="Save & Continue" />
    </div>
  )
}

// ─── Step 2: Primary Contact ───────────────────────────────────────────────────

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

// ─── Step 2: Service Contacts ─────────────────────────────────────────────────

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
              <button type="button" onClick={() => removeRow(i)} className="text-xs text-red-400 hover:text-red-300">
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

      <button type="button" onClick={addRow} className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300">
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

// ─── Step 3: Cleaning Checklist ───────────────────────────────────────────────

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
      <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300">
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

// ─── Step 4: Notes & AI Instructions ─────────────────────────────────────────

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

// ─── Done Screen ──────────────────────────────────────────────────────────────

function DoneScreen({
  propertyId,
  propertyName,
  isNew,
}: {
  propertyId: string
  propertyName: string
  isNew: boolean
}) {
  return (
    <div className="text-center py-10 space-y-4">
      <div className="w-14 h-14 bg-emerald-950 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-700/40">
        <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">
          {isNew ? `${propertyName} has been added!` : `${propertyName} is all set!`}
        </h2>
        <p className="text-sm text-[#8080aa] mt-1">
          You can always update contacts, the checklist, and notes from the property page.
        </p>
      </div>
      <Link href={`/properties/${propertyId}`} className="btn-primary inline-flex mx-auto">
        Go to Property →
      </Link>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function OnboardingWizard({
  isNew = false,
  propertyId: propPropertyId,
  initialName = '',
  initialAddress = '',
  initialDescription = '',
  initialChecklist = [],
  initialNotes = '',
  initialAiInstructions = '',
}: {
  isNew?: boolean
  propertyId?: string
  initialName?: string
  initialAddress?: string
  initialDescription?: string
  initialChecklist?: string[]
  initialNotes?: string
  initialAiInstructions?: string
}) {
  const [step, setStep] = useState(0)
  // For edit mode all steps are accessible; for new, start at 0 and expand as we progress
  const [maxReached, setMaxReached] = useState(isNew ? 0 : STEPS.length - 1)
  const [resolvedPropertyId, setResolvedPropertyId] = useState<string | undefined>(propPropertyId)
  const [resolvedName, setResolvedName] = useState(initialName)
  const [resolvedPropertyType, setResolvedPropertyType] = useState('single_family')

  const done = step >= STEPS.length
  const next = () => {
    const nextStep = step + 1
    setStep(nextStep)
    setMaxReached(prev => Math.max(prev, nextStep))
  }

  function handleStepClick(targetStep: number) {
    // Don't allow jumping past step 0 if no property exists yet
    if (targetStep > 0 && !resolvedPropertyId) return
    setStep(targetStep)
  }

  function handleDetailsSave(id: string, name: string, propertyType: string) {
    setResolvedPropertyId(id)
    setResolvedName(name)
    setResolvedPropertyType(propertyType)
    next()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {isNew ? (
            <Link href="/properties" className="text-[#60608a] hover:text-white text-sm transition-colors">
              ← All Properties
            </Link>
          ) : resolvedPropertyId ? (
            <Link href={`/properties/${resolvedPropertyId}`} className="text-[#60608a] hover:text-white text-sm transition-colors">
              ← {resolvedName || 'Property'}
            </Link>
          ) : null}
        </div>
        <h1 className="text-xl font-bold text-white">
          {isNew ? 'Add Property' : 'Edit Property Setup'}
        </h1>
        <p className="text-sm text-[#8080aa] mt-0.5">
          {isNew
            ? 'Get your property set up. Steps after the first are optional — skip anything to fill in later.'
            : 'Update contacts, checklist, and notes for this property. Every step is optional — skip anything you\'d like to fill in later.'}
        </p>
      </div>

      <div className="card p-6">
        {done ? (
          <DoneScreen propertyId={resolvedPropertyId!} propertyName={resolvedName} isNew={isNew} />
        ) : (
          <>
            <StepIndicator current={step} total={STEPS.length} maxReached={maxReached} onStepClick={handleStepClick} />

            <div className="mb-5">
              <h2 className="text-base font-semibold text-white">{STEPS[step].title}</h2>
              <p className="text-xs text-[#8080aa] mt-0.5">{STEPS[step].subtitle}</p>
            </div>

            {step === 0 && (
              <PropertyDetailsStep
                isNew={isNew}
                propertyId={resolvedPropertyId}
                initialName={initialName}
                initialAddress={initialAddress}
                initialDescription={initialDescription}
                onSave={handleDetailsSave}
                onSkip={isNew ? undefined : next}
              />
            )}
            {step === 1 && resolvedPropertyId && (
              <GuestAccessStep propertyId={resolvedPropertyId} onNext={next} onSkip={next} />
            )}
            {step === 2 && resolvedPropertyId && (
              <PrimaryContactStep propertyId={resolvedPropertyId} onNext={next} onSkip={next} />
            )}
            {step === 3 && resolvedPropertyId && (
              <ServiceContactsStep propertyId={resolvedPropertyId} onNext={next} onSkip={next} />
            )}
            {step === 4 && resolvedPropertyId && (
              <ChecklistStep
                propertyId={resolvedPropertyId}
                initialChecklist={initialChecklist}
                onNext={next}
                onSkip={next}
              />
            )}
            {step === 5 && resolvedPropertyId && (
              <NotesStep
                propertyId={resolvedPropertyId}
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
