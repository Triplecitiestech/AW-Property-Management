import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CONTACT_ROLES } from '@/lib/contact-roles'

function roleLabel(role: string) {
  return CONTACT_ROLES.find(r => r.value === role)?.label ?? role
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; property_id?: string; role?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('property_contacts')
    .select('*, properties(id, name)')
    .order('name')

  if (filters.property_id) query = query.eq('property_id', filters.property_id)
  if (filters.role) query = query.eq('role', filters.role)
  if (filters.q) query = query.ilike('name', `%${filters.q}%`)

  const { data: contacts } = await query
  const { data: properties } = await supabase.from('properties').select('id, name').order('name')

  const hasFilters = !!(filters.property_id || filters.role || filters.q)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-[#6480a0] text-sm mt-1">{contacts?.length ?? 0} contacts</p>
        </div>
        <Link href="/contacts/new" className="btn-primary text-sm">
          + Add Contact
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form className="flex flex-wrap items-center gap-3">
          <input
            name="q"
            type="search"
            defaultValue={filters.q ?? ''}
            placeholder="Search contacts…"
            className="form-input text-sm flex-1 min-w-[160px]"
          />
          <select name="property_id" className="form-select text-sm w-auto" defaultValue={filters.property_id ?? ''}>
            <option value="">All Properties</option>
            {properties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select name="role" className="form-select text-sm w-auto" defaultValue={filters.role ?? ''}>
            <option value="">All Roles</option>
            {CONTACT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button type="submit" className="btn-secondary text-sm">Filter</button>
          {hasFilters && <Link href="/contacts" className="text-sm text-[#6480a0] hover:text-[#94a3b8]">Clear</Link>}
        </form>
      </div>

      {/* Contact Cards */}
      <div className="space-y-2">
        {contacts?.map(contact => {
          const property = contact.properties as { id: string; name: string } | null
          return (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="card flex items-center gap-4 px-5 py-4 hover:bg-[#1e2d42] hover:border-[#3a5070] transition-all cursor-pointer group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-teal-500
                              flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {contact.name.charAt(0).toUpperCase()}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white group-hover:text-violet-300 transition-colors">
                    {contact.name}
                  </span>
                  {contact.is_primary && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Primary
                    </span>
                  )}
                  <span className="text-xs text-[#6480a0]">{roleLabel(contact.role)}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {property && (
                    <span className="text-xs text-[#6480a0]">{property.name}</span>
                  )}
                  {contact.phone && (
                    <span className="text-xs text-[#6480a0]">{contact.phone}</span>
                  )}
                  {contact.email && (
                    <span className="text-xs text-[#6480a0] truncate">{contact.email}</span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <svg className="w-4 h-4 text-[#4a6080] group-hover:text-[#6480a0] flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )
        })}

        {(!contacts || contacts.length === 0) && (
          <div className="card p-10 text-center">
            <p className="text-[#6480a0]">
              No contacts found.{' '}
              {hasFilters
                ? <Link href="/contacts" className="text-violet-400 hover:text-violet-300">Clear filters</Link>
                : <span>Add contacts from a property page or click <Link href="/contacts/new" className="text-violet-400 hover:text-violet-300">+ Add Contact</Link>.</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
