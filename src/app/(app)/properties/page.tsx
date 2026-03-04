import { getAppContext } from '@/lib/impersonation'
import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import {
  DataGridHeader,
  DataGridRow,
  DataGridCell,
  type Column,
} from '@/components/ui/DataGrid'

const COLUMNS: Column[] = [
  { label: 'Property',     width: '1.6fr', align: 'left' },
  { label: 'Open Tickets', width: '120px', align: 'center', hideBelow: 'md' },
  { label: 'Occupancy',    width: '120px', align: 'center', hideBelow: 'sm' },
  { label: 'Condition',    width: '160px', align: 'center' },
  { label: '',              width: '48px',  align: 'right' },
]

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const ctx = await getAppContext()
  const supabase = ctx.supabase

  let query = supabase
    .from('properties')
    .select('*, property_status(*)')
    .order('name')

  if (ctx.isImpersonating && ctx.propertyIds) {
    const pids = ctx.propertyIds.length > 0 ? ctx.propertyIds : ['00000000-0000-0000-0000-000000000000']
    query = query.in('id', pids)
  }
  if (q) query = query.ilike('name', `%${q}%`)

  const { data: properties } = await query

  let ticketQuery = supabase
    .from('service_requests')
    .select('property_id')
    .in('status', ['open', 'in_progress'])
  if (ctx.isImpersonating && ctx.propertyIds) {
    const pids = ctx.propertyIds.length > 0 ? ctx.propertyIds : ['00000000-0000-0000-0000-000000000000']
    ticketQuery = ticketQuery.in('property_id', pids)
  }
  const { data: openTicketCounts } = await ticketQuery

  const ticketMap: Record<string, number> = {}
  openTicketCounts?.forEach(t => {
    ticketMap[t.property_id] = (ticketMap[t.property_id] ?? 0) + 1
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Properties</h1>
          <p className="text-[#6480a0] text-sm mt-1">{properties?.length ?? 0} properties</p>
        </div>
        <Link href="/properties/new" className="btn-primary text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Property
        </Link>
      </div>

      {/* Search */}
      <div className="card p-4">
        <form className="flex items-center gap-3">
          <input
            name="q"
            type="search"
            defaultValue={q ?? ''}
            placeholder="Search properties…"
            className="form-input text-sm flex-1"
          />
          <button type="submit" className="btn-secondary text-sm">Search</button>
          {q && <Link href="/properties" className="text-sm text-[#6480a0] hover:text-[#94a3b8]">Clear</Link>}
        </form>
      </div>

      <div>
        <DataGridHeader columns={COLUMNS} />
        <div className="space-y-1.5">
          {properties?.map(property => {
            const ps = Array.isArray(property.property_status)
              ? property.property_status[0]
              : property.property_status
            const ticketCount = ticketMap[property.id] ?? 0

            return (
              <DataGridRow key={property.id} href={`/properties/${property.id}`} columns={COLUMNS}>
                <DataGridCell align="left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-violet-400
                                    flex items-center justify-center flex-shrink-0 shadow-lg">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white group-hover:text-violet-300 transition-colors truncate">
                        {property.name}
                      </p>
                      <p className="text-xs text-[#6480a0] truncate">{property.address || 'No address'}</p>
                    </div>
                  </div>
                </DataGridCell>
                <DataGridCell hideBelow="md">
                  {ticketCount > 0 ? (
                    <StatusBadge value={String(ticketCount)} variant="custom" className="bg-rose-500/20 text-rose-300 border border-rose-500/30" />
                  ) : (
                    <span className="text-xs text-[#3d5a78]">0</span>
                  )}
                </DataGridCell>
                <DataGridCell hideBelow="sm">
                  {ps ? <StatusBadge value={ps.occupancy} /> : <span className="text-xs text-[#3d5a78]">—</span>}
                </DataGridCell>
                <DataGridCell>
                  {ps ? <StatusBadge value={ps.status} /> : <span className="text-xs text-[#3d5a78]">—</span>}
                </DataGridCell>
                <DataGridCell align="right">
                  <svg className="w-4 h-4 text-[#4a6080] group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </DataGridCell>
              </DataGridRow>
            )
          })}
        </div>

        {(!properties || properties.length === 0) && (
          <div className="card mt-2">
            <EmptyState
              title={q ? 'No properties match search' : 'No properties yet'}
              description={q ? undefined : 'Add your first property to get started.'}
              actionLabel={q ? 'Clear search' : 'Add Property'}
              actionHref={q ? '/properties' : '/properties/new'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
