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
  const [{ data: properties }, { data: units }] = await Promise.all([
    supabase.from('properties').select('id, name').order('name'),
    property_id
      ? supabase.from('property_units').select('id, identifier, name').eq('property_id', property_id).eq('is_active', true).order('sort_order').order('identifier')
      : Promise.resolve({ data: [] }),
  ])

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

          {units && units.length > 0 && (
            <div>
              <label className="form-label" htmlFor="unit_id">Unit / Room</label>
              <select id="unit_id" name="unit_id" className="form-select">
                <option value="">All units / Property-wide</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.identifier}{u.name ? ` — ${u.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="form-label" htmlFor="stay_type">Stay Type *</label>
            <select id="stay_type" name="stay_type" className="form-select" required defaultValue="short_term">
              <option value="short_term">Short-term Guest (Airbnb, vacation rental)</option>
              <option value="long_term">Long-term Tenant (month-to-month, annual lease)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="guest_name">Name *</label>
              <input id="guest_name" name="guest_name" type="text" className="form-input" required placeholder="Jordan Smith" />
            </div>
            <div>
              <label className="form-label" htmlFor="guest_email">Email</label>
              <input id="guest_email" name="guest_email" type="email" className="form-input" placeholder="guest@example.com" />
              <p className="text-xs text-gray-400 mt-1">Access link will be emailed if provided</p>
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

          {/* Guest Access Info */}
          <div className="border-t border-[#2a3d58] pt-4">
            <p className="text-sm font-medium text-white mb-3">Guest Access Info <span className="text-xs text-[#6480a0] font-normal">(sent to guest)</span></p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="wifi_name">Wi-Fi Network</label>
                <input id="wifi_name" name="wifi_name" type="text" className="form-input" placeholder="MyNetwork" />
              </div>
              <div>
                <label className="form-label" htmlFor="wifi_password">Wi-Fi Password</label>
                <input id="wifi_password" name="wifi_password" type="text" className="form-input" placeholder="password123" />
              </div>
            </div>
            <div className="mt-3">
              <label className="form-label" htmlFor="door_code">Door / Lock Code</label>
              <input id="door_code" name="door_code" type="text" className="form-input" placeholder="1234" />
            </div>
            <div className="mt-3">
              <label className="form-label" htmlFor="host_instructions">Host Instructions</label>
              <textarea id="host_instructions" name="host_instructions" className="form-input" rows={3} placeholder="Check-in instructions, parking, trash day, etc." />
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="notes">Internal Notes</label>
            <textarea id="notes" name="notes" className="form-input" rows={2} placeholder="Internal notes (not sent to guest)" />
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
