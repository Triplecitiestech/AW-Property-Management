import { getAppContext } from '@/lib/impersonation'
import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import {
  DataGridHeader,
  DataGridRow,
  DataGridCell,
  type Column,
} from '@/components/ui/DataGrid'

const COLUMNS: Column[] = [
  { label: 'Guest',    width: '1fr',   align: 'left' },
  { label: 'Property', width: '160px', align: 'left',   hideBelow: 'md' },
  { label: 'Dates',    width: '200px', align: 'left',   hideBelow: 'sm' },
  { label: 'Status',   width: '110px', align: 'left' },
  { label: '',          width: '32px',  align: 'center' },
]

export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string; q?: string }>
}) {
  const { property_id, q } = await searchParams
  const ctx = await getAppContext()
  const supabase = ctx.supabase

  let query = supabase
    .from('stays')
    .select('*, properties(name, id)')
    .order('start_date', { ascending: false })

  if (ctx.isImpersonating && ctx.propertyIds) {
    const pids = ctx.propertyIds.length > 0 ? ctx.propertyIds : ['00000000-0000-0000-0000-000000000000']
    query = query.in('property_id', pids)
  }
  if (property_id) query = query.eq('property_id', property_id)
  if (q) query = query.ilike('guest_name', `%${q}%`)

  const { data: stays } = await query
  let propsQuery = supabase.from('properties').select('id, name').order('name')
  if (ctx.isImpersonating && ctx.propertyIds) {
    const pids = ctx.propertyIds.length > 0 ? ctx.propertyIds : ['00000000-0000-0000-0000-000000000000']
    propsQuery = propsQuery.in('id', pids)
  }
  const { data: properties } = await propsQuery

  const today = new Date().toISOString().split('T')[0]

  function getStayStatus(start: string, end: string) {
    if (end < today) return { label: 'Past', cls: 'badge-closed' }
    if (start <= today && end >= today) return { label: 'Active', cls: 'badge-open' }
    return { label: 'Upcoming', cls: 'badge-in_progress' }
  }

  const hasFilters = !!(property_id || q)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Stays</h1>
          <p className="text-[#6480a0] text-sm mt-1">{stays?.length ?? 0} stays</p>
        </div>
        <Link href="/stays/new" className="btn-primary text-sm flex items-center gap-2">
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
            className="form-input text-sm flex-1 min-w-[160px]"
          />
          <select name="property_id" className="form-select text-sm w-auto" defaultValue={property_id ?? ''}>
            <option value="">All Properties</option>
            {properties?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button type="submit" className="btn-secondary text-sm">Filter</button>
          {hasFilters && (
            <Link href="/stays" className="text-sm text-[#6480a0] hover:text-[#94a3b8]">Clear</Link>
          )}
        </form>
      </div>

      {/* Stay Grid */}
      <div>
        <DataGridHeader columns={COLUMNS} />
        <div className="space-y-1.5">
          {stays?.map(stay => {
            const { label, cls } = getStayStatus(stay.start_date, stay.end_date)
            const nights = Math.ceil((new Date(stay.end_date).getTime() - new Date(stay.start_date).getTime()) / (1000 * 60 * 60 * 24))
            const propName = (stay.properties as { name: string } | null)?.name ?? '—'

            return (
              <DataGridRow key={stay.id} href={`/stays/${stay.id}`} columns={COLUMNS}>
                <DataGridCell>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-teal-500
                                    flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                      {stay.guest_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-white group-hover:text-violet-300 transition-colors truncate">
                      {stay.guest_name}
                    </span>
                  </div>
                </DataGridCell>
                <DataGridCell hideBelow="md">
                  <span className="text-xs text-[#6480a0] truncate">{propName}</span>
                </DataGridCell>
                <DataGridCell hideBelow="sm">
                  <span className="text-xs text-[#6480a0]">
                    {stay.start_date} → {stay.end_date}
                    <span className="text-[#3d5a78] ml-1">({nights}n)</span>
                  </span>
                </DataGridCell>
                <DataGridCell align="left">
                  <span className={`badge ${cls}`}>{label}</span>
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

        {(!stays || stays.length === 0) && (
          <div className="card mt-2">
            <EmptyState
              title={hasFilters ? 'No stays match filters' : 'No stays yet'}
              description={hasFilters ? undefined : 'Add your first stay to track guests and reservations.'}
              actionLabel={hasFilters ? 'Clear filters' : 'Add Stay'}
              actionHref={hasFilters ? '/stays' : '/stays/new'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
