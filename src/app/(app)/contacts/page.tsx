import { getAppContext } from '@/lib/impersonation'
import Link from 'next/link'
import { CONTACT_ROLES } from '@/lib/contact-roles'
import ListRow from '@/components/ui/ListRow'
import EmptyState from '@/components/ui/EmptyState'

function roleLabel(role: string) {
  return CONTACT_ROLES.find(r => r.value === role)?.label ?? role
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; property_id?: string; role?: string }>
}) {
  const filters = await searchParams
  const ctx = await getAppContext()
  const supabase = ctx.supabase

  let query = supabase
    .from('property_contacts')
    .select('*, properties(id, name)')
    .order('name')

  if (ctx.isImpersonating && ctx.propertyIds) {
    const pids = ctx.propertyIds.length > 0 ? ctx.propertyIds : ['00000000-0000-0000-0000-000000000000']
    query = query.in('property_id', pids)
  }
  if (filters.property_id) query = query.eq('property_id', filters.property_id)
  if (filters.role) query = query.eq('role', filters.role)
  if (filters.q) query = query.ilike('name', `%${filters.q}%`)

  const { data: contacts } = await query
  let propsQuery = supabase.from('properties').select('id, name').order('name')
  if (ctx.isImpersonating && ctx.propertyIds) {
    const pids = ctx.propertyIds.length > 0 ? ctx.propertyIds : ['00000000-0000-0000-0000-000000000000']
    propsQuery = propsQuery.in('id', pids)
  }
  const { data: properties } = await propsQuery

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
          const meta: string[] = []
          if (property) meta.push(`Property: ${property.name}`)
          if (contact.phone) meta.push(`Phone: ${contact.phone}`)
          if (contact.email) meta.push(`Email: ${contact.email}`)

          return (
            <ListRow
              key={contact.id}
              href={`/contacts/${contact.id}`}
              avatar={
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-teal-500
                                flex items-center justify-center text-white font-semibold text-sm">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
              }
              primary={contact.name}
              secondary={
                <span className="flex items-center gap-2 flex-wrap">
                  <span>Role: {roleLabel(contact.role)}</span>
                  {meta.map((m, i) => (
                    <span key={i} className="flex items-center gap-2">
                      <span className="text-[#2a3d58]">&middot;</span>
                      <span>{m}</span>
                    </span>
                  ))}
                </span>
              }
              badges={
                contact.is_primary ? (
                  <span className="badge bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    Primary
                  </span>
                ) : undefined
              }
            />
          )
        })}

        {(!contacts || contacts.length === 0) && (
          <div className="card">
            <EmptyState
              title={hasFilters ? 'No contacts match filters' : 'No contacts yet'}
              description={hasFilters ? undefined : 'Add contacts from a property page or use the button above.'}
              actionLabel={hasFilters ? 'Clear filters' : '+ Add Contact'}
              actionHref={hasFilters ? '/contacts' : '/contacts/new'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
