import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { updateProfile } from '@/lib/actions/profile'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone_number')
    .eq('id', user.id)
    .single()

  async function handleUpdate(formData: FormData) {
    'use server'
    await updateProfile(formData)
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-[#6480a0] hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1>My Profile</h1>
      </div>

      <div className="card p-6 space-y-6">
        {/* Email (read-only) */}
        <div>
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input opacity-60 cursor-not-allowed"
            value={user.email ?? ''}
            disabled
            readOnly
          />
          <p className="text-xs text-[#6480a0] mt-1">Email cannot be changed here.</p>
        </div>

        {/* Editable fields */}
        <form action={handleUpdate} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="full_name">Full Name *</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              className="form-input"
              defaultValue={profile?.full_name ?? ''}
              required
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="phone_number">Phone Number</label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              className="form-input"
              defaultValue={profile?.phone_number ?? ''}
              placeholder="555-0100"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary">Save Changes</button>
            <Link href="/settings" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
