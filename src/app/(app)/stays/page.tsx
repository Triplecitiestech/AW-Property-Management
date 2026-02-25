import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string; q?: string }>
}) {
  const { property_id, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('stays')
    .select('*, properties(name, id)')
    .order('start_date', { ascending: false })

  if (property_id) query = query.eq('property_id', property_id)
  if (q) query = query.ilike('guest_name', `%${q}%`)

  const { data: stays } = await query
  const { data: properties } = await supabase.from('properties').select('id, name').order('name')

  const today = new Date().toISOString().split('T')[0]

  function getStayStatus(start: string, end: string) {
    if (end < today) return { label: 'Past', cls: 'badge-closed' }
    if (start <= today && end >= today) return { label: 'Active', cls: 'badge-open' }
    return { label: 'Upcoming', cls: 'badge-in_progress' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Stays</h1>
          <p className="text-gray-500 mt-1">{stays?.length ?? 0} stays</p>
        </div>
        <Link href="/stays/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Stay
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form className="flex flex-wrap items-center gap-3">
          <input
            name="q"
            type="search"
            defaultValue={q ?? ''}
            placeholder="Search guest name…"
            className="form-input text-sm w-auto flex-1 min-w-[160px]"
          />
          <select name="property_id" className="form-select text-sm w-auto" defaultValue={property_id ?? ''}>
            <option value="">All Properties</option>
            {properties?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button type="submit" className="btn-secondary text-sm">Filter</button>
          {(property_id || q) && <Link href="/stays" className="text-sm text-gray-500 hover:text-gray-700">Clear</Link>}
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Guest</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Property</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Dates</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stays?.map(stay => {
              const { label, cls } = getStayStatus(stay.start_date, stay.end_date)
              const nights = Math.ceil((new Date(stay.end_date).getTime() - new Date(stay.start_date).getTime()) / (1000 * 60 * 60 * 24))
              return (
                <tr key={stay.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{stay.guest_name}</p>
                    {stay.guest_email && <p className="text-xs text-gray-400">{stay.guest_email}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {(stay.properties as {name:string}|null)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>{stay.start_date} → {stay.end_date}</p>
                    <p className="text-xs text-gray-400">{nights} night{nights !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${cls}`}>{label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/stays/${stay.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                  </td>
                </tr>
              )
            })}
            {(!stays || stays.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  No stays found.{' '}
                  <Link href="/stays/new" className="text-blue-600 hover:underline">Add one</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
