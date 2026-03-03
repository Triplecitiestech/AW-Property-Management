import { getAppContext } from '@/lib/impersonation'
import Link from 'next/link'
import { CONTACT_ROLES } from '@/lib/contact-roles'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import {
  DataGridHeader,
  DataGridRow,
  DataGridCell,
  type Column,
} from '@/components/ui/DataGrid'

const COLUMNS: Column[] = [
  { label: 'Contact',  width: '1fr',   align: 'left' },
  { label: 'Role',     width: '120px', align: 'left' },
  { label: 'Property', width: '160px', align: 'left',   hideBelow: 'md' },
  { label: 'Phone',    width: '140px', align: 'left',   hideBelow: 'sm' },
  { label: '',          width: '32px',  align: 'center' },
]

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

      {/* Contact Grid */}
      <div>
        <DataGridHeader columns={COLUMNS} />
        <div className="space-y-1.5">
          {contacts?.map(contact => {
            const property = contact.properties as { id: string; name: string } | null

            return (
              <DataGridRow key={contact.id} href={`/contacts/${contact.id}`} columns={COLUMNS}>
                <DataGridCell>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-teal-500
                                    flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-white group-hover:text-violet-300 transition-colors truncate block">
                        {contact.name}
                      </span>
                      {contact.is_primary && (
                        <span className="text-[10px] text-violet-300">Primary</span>
                      )}
                    </div>
                  </div>
                </DataGridCell>
                <DataGridCell align="left">
                  <StatusBadge value={contact.role} variant="role" />
                </DataGridCell>
                <DataGridCell hideBelow="md">
                  <span className="text-xs text-[#6480a0] truncate">{property?.name ?? '—'}</span>
                </DataGridCell>
                <DataGridCell hideBelow="sm">
                  <span className="text-xs text-[#6480a0]">{contact.phone || '—'}</span>
                </DataGridCell>
                <DataGridCell align="center">
                  <svg className="w-4 h-4 text-[#4a6080] group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </DataGridCell>
              </DataGridRow>
            )
          })}
        </div>

        {(!contacts || contacts.length === 0) && (
          <div className="card mt-2">
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
