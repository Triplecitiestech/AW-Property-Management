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
          <h1>Contacts</h1>
          <p className="text-gray-500 mt-1">{contacts?.length ?? 0} contacts</p>
        </div>
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
          {hasFilters && <Link href="/contacts" className="text-sm text-gray-500 hover:text-gray-700">Clear</Link>}
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Property</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts?.map(contact => {
              const property = contact.properties as { id: string; name: string } | null
              return (
                <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{contact.name}</span>
                      {contact.is_primary && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">Primary</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{roleLabel(contact.role)}</td>
                  <td className="px-4 py-3">
                    {property ? (
                      <Link href={`/properties/${property.id}`} className="text-blue-600 hover:underline">
                        {property.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {contact.phone
                      ? <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {contact.email
                      ? <a href={`mailto:${contact.email}`} className="hover:underline text-xs">{contact.email}</a>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                    {contact.notes ?? <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              )
            })}
            {(!contacts || contacts.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  No contacts found.{' '}
                  {hasFilters
                    ? <Link href="/contacts" className="text-blue-600 hover:underline">Clear filters</Link>
                    : <span>Add contacts from a property page.</span>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
