import { createClient } from '@/lib/supabase/server'
import { createStay } from '@/lib/actions/stays'
import Link from 'next/link'

async function handleCreate(formData: FormData) {
  'use server'
  await createStay(formData)
}

export default async function NewStayPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string }>
}) {
  const { property_id } = await searchParams
  const supabase = await createClient()
  const { data: properties } = await supabase.from('properties').select('id, name').order('name')

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/stays" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1>Add Stay</h1>
      </div>

      <div className="card p-6">
        <form action={handleCreate} className="space-y-5">
          <div>
            <label className="form-label" htmlFor="property_id">Property *</label>
            <select id="property_id" name="property_id" className="form-select" required defaultValue={property_id ?? ''}>
              <option value="" disabled>Select a property</option>
              {properties?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="guest_name">Guest Name *</label>
              <input id="guest_name" name="guest_name" type="text" className="form-input" required placeholder="Jordan Smith" />
            </div>
            <div>
              <label className="form-label" htmlFor="guest_email">Guest Email</label>
              <input id="guest_email" name="guest_email" type="email" className="form-input" placeholder="guest@example.com" />
              <p className="text-xs text-gray-400 mt-1">Guest link will be emailed if provided</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="start_date">Check-in Date *</label>
              <input id="start_date" name="start_date" type="date" className="form-input" required defaultValue={today} />
            </div>
            <div>
              <label className="form-label" htmlFor="end_date">Check-out Date *</label>
              <input id="end_date" name="end_date" type="date" className="form-input" required />
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" className="form-input" rows={3} placeholder="Late check-in, special requests, etc." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary">Create Stay</button>
            <Link href="/stays" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
