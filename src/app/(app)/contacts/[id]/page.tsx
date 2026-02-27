import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CONTACT_ROLES } from '@/lib/contact-roles'
function roleLabel(role: string) {
  return CONTACT_ROLES.find(r => r.value === role)?.label ?? role
}

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: contact },
    { data: workOrders },
  ] = await Promise.all([
    supabase
      .from('property_contacts')
      .select('*, properties(id, name)')
      .eq('id', id)
      .single(),
    supabase
      .from('service_requests')
      .select('id, title, status, category, priority, created_at, properties(name)')
      .eq('assigned_contact_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (!contact) notFound()

  // Check if current user is an admin/owner in their org
  const { data: orgMember } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .single()
  const isAdmin = orgMember?.role === 'owner' || orgMember?.role === 'admin'

  const property = contact.properties as { id: string; name: string } | null

  const STATUS_STYLES: Record<string, string> = {
    open: 'badge-open',
    in_progress: 'badge-in_progress',
    resolved: 'badge-closed',
    closed: 'badge-closed',
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/contacts" className="text-[#6480a0] hover:text-[#94a3b8] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-600 to-teal-500
                          flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{contact.name}</h1>
            <p className="text-[#6480a0] text-sm">
              {roleLabel(contact.role)}
              {property && <> · {property.name}</>}
              {contact.is_primary && (
                <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded
                                 bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Primary
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Edit form + contact info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contact info / edit form */}
          <div className="card p-6">
            <h3 className="font-semibold text-white mb-4">
              {isAdmin ? 'Edit Contact' : 'Contact Info'}
            </h3>
            <form
              action={async (formData: FormData) => {
                'use server'
                const { updateContact: update } = await import('@/lib/actions/contacts')
                await update(id, contact.property_id, formData)
                const { revalidatePath } = await import('next/cache')
                revalidatePath(`/contacts/${id}`)
                revalidatePath('/contacts')
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Name</label>
                  <input
                    name="name"
                    type="text"
                    className="form-input"
                    defaultValue={contact.name}
                    required
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <label className="form-label">Role</label>
                  <select
                    name="role"
                    className="form-select"
                    defaultValue={contact.role}
                    disabled={!isAdmin}
                  >
                    {CONTACT_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    className="form-input"
                    defaultValue={contact.phone ?? ''}
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    name="email"
                    type="email"
                    className="form-input"
                    defaultValue={contact.email ?? ''}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea
                  name="notes"
                  className="form-input"
                  rows={2}
                  defaultValue={contact.notes ?? ''}
                  disabled={!isAdmin}
                />
              </div>
              <input type="hidden" name="is_primary" value={contact.is_primary ? 'true' : 'false'} />
              {isAdmin && (
                <button type="submit" className="btn-primary text-sm">Save Changes</button>
              )}
            </form>
          </div>

          {/* Work Orders */}
          <div className="card p-6">
            <h3 className="font-semibold text-white mb-4">Work Orders</h3>
            {workOrders && workOrders.length > 0 ? (
              <div className="space-y-2">
                {workOrders.map(wo => {
                  const prop = wo.properties as unknown as { name: string } | null
                  return (
                    <Link
                      key={wo.id}
                      href={`/work-orders/${wo.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#0f1829] border border-[#1e2d42]
                                 hover:border-[#2a3d58] hover:bg-[#1a2436] transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors truncate">
                          {wo.title}
                        </p>
                        <p className="text-xs text-[#6480a0]">
                          {prop?.name} · {new Date(wo.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`badge ${STATUS_STYLES[wo.status] ?? 'badge-closed'} flex-shrink-0`}>
                        {wo.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-[#6480a0]">No work orders assigned to this contact.</p>
            )}
          </div>
        </div>

        {/* Right sidebar: quick info */}
        <div className="space-y-4">
          {/* Quick contact card */}
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-3">Reach Out</h3>
            <div className="space-y-2">
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#0f1829] border border-[#1e2d42]
                             hover:border-[#2a3d58] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#6480a0]">Phone</p>
                    <p className="text-sm text-white group-hover:text-teal-300 transition-colors truncate">{contact.phone}</p>
                  </div>
                </a>
              ) : (
                <div className="p-3 rounded-xl bg-[#0f1829] border border-[#1e2d42]">
                  <p className="text-xs text-[#4a6080]">No phone on file</p>
                </div>
              )}

              {contact.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#0f1829] border border-[#1e2d42]
                             hover:border-[#2a3d58] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#6480a0]">Email</p>
                    <p className="text-sm text-white group-hover:text-violet-300 transition-colors truncate">{contact.email}</p>
                  </div>
                </a>
              ) : (
                <div className="p-3 rounded-xl bg-[#0f1829] border border-[#1e2d42]">
                  <p className="text-xs text-[#4a6080]">No email on file</p>
                </div>
              )}
            </div>
          </div>

          {/* Property link */}
          {property && (
            <div className="card p-5">
              <h3 className="font-semibold text-white mb-3 text-sm">Property</h3>
              <Link
                href={`/properties/${property.id}`}
                className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {property.name}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
