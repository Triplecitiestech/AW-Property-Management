import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { addContact } from '@/lib/actions/contacts'
import Link from 'next/link'
import { CONTACT_ROLES } from '@/lib/contact-roles'

async function handleCreate(formData: FormData) {
  'use server'
  const propertyId = formData.get('property_id') as string
  if (!propertyId) return
  const result = await addContact(propertyId, formData)
  if (!result?.error) {
    redirect('/contacts')
  }
}

export default async function NewContactPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: properties } = await supabase.from('properties').select('id, name').order('name')

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
        <form action={handleCreate} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="property_id">Property *</label>
            <select id="property_id" name="property_id" className="form-select" required defaultValue="">
              <option value="" disabled>Select a property</option>
              {properties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="name">Name *</label>
              <input id="name" name="name" type="text" className="form-input" required placeholder="John Smith" />
            </div>
            <div>
              <label className="form-label" htmlFor="role">Role</label>
              <select id="role" name="role" className="form-select" defaultValue="other">
                {CONTACT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" className="form-input" placeholder="555-0100" />
            </div>
            <div>
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="form-input" placeholder="contact@example.com" />
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="notes">Notes</label>
            <input id="notes" name="notes" type="text" className="form-input" placeholder="Available Mon–Fri 8am–5pm" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="is_primary" value="true" className="accent-violet-500" />
            <span className="text-sm text-[#8080aa]">Set as primary contact for this property</span>
          </label>

          <input type="hidden" name="is_primary" value="false" />

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary">Add Contact</button>
            <Link href="/contacts" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
