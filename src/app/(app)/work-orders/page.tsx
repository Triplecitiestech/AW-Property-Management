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

function woLabel(num: number | null) {
  return num ? `WO-${String(num).padStart(4, '0')}` : '—'
}

const COLUMNS: Column[] = [
  { label: 'WO#',      width: '80px',  align: 'center' },
  { label: 'Title',    width: '1.6fr', align: 'left' },
  { label: 'Property', width: '1.2fr', align: 'center', hideBelow: 'md' },
  { label: 'Priority', width: '120px', align: 'center' },
  { label: 'Status',   width: '120px', align: 'center' },
  { label: '',          width: '48px',  align: 'right' },
]

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string; status?: string; priority?: string; q?: string }>
}) {
  const filters = await searchParams
  const ctx = await getAppContext()
  const supabase = ctx.supabase

  let query = supabase
    .from('service_requests')
    .select('*, properties(name), assignee:profiles!service_requests_assignee_id_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (ctx.isImpersonating && ctx.propertyIds) {
    const pids = ctx.propertyIds.length > 0 ? ctx.propertyIds : ['00000000-0000-0000-0000-000000000000']
    query = query.in('property_id', pids)
  }
  if (filters.property_id) query = query.eq('property_id', filters.property_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.q) {
    const numMatch = filters.q.replace(/^wo-?/i, '')
    const num = parseInt(numMatch, 10)
    if (!isNaN(num)) {
      query = query.or(`title.ilike.%${filters.q}%,work_order_number.eq.${num}`)
    } else {
      query = query.ilike('title', `%${filters.q}%`)
    }
  }

  const { data: workOrders } = await query
  let propsQuery = supabase.from('properties').select('id, name').order('name')
  if (ctx.isImpersonating && ctx.propertyIds) {
    const pids = ctx.propertyIds.length > 0 ? ctx.propertyIds : ['00000000-0000-0000-0000-000000000000']
    propsQuery = propsQuery.in('id', pids)
  }
  const { data: properties } = await propsQuery
  const hasFilters = !!(filters.property_id || filters.status || filters.priority || filters.q)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Work Orders</h1>
          <p className="text-[#6480a0] text-sm mt-1">{workOrders?.length ?? 0} work orders</p>
        </div>
        <Link href="/work-orders/new" className="btn-primary text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Work Order
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form className="flex flex-wrap items-center gap-3">
          <input
            name="q"
            type="search"
            defaultValue={filters.q ?? ''}
            placeholder="Search by title or WO number…"
            className="form-input text-sm flex-1 min-w-[200px]"
          />
          <select name="property_id" className="form-select text-sm w-auto" defaultValue={filters.property_id ?? ''}>
            <option value="">All Properties</option>
            {properties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select name="status" className="form-select text-sm w-auto" defaultValue={filters.status ?? ''}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select name="priority" className="form-select text-sm w-auto" defaultValue={filters.priority ?? ''}>
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button type="submit" className="btn-secondary text-sm">Apply</button>
          {hasFilters && (
            <Link href="/work-orders" className="text-sm text-[#6480a0] hover:text-[#94a3b8]">Clear</Link>
          )}
        </form>
      </div>

      {/* Work Order Grid */}
      <div>
        <DataGridHeader columns={COLUMNS} />
        <div className="space-y-1.5">
          {workOrders?.map(wo => {
            const propName = (wo.properties as { name: string } | null)?.name ?? '—'

            return (
              <DataGridRow key={wo.id} href={`/work-orders/${wo.id}`} columns={COLUMNS}>
                <DataGridCell>
                  <span className="font-mono text-xs text-[#6480a0]">{woLabel(wo.work_order_number)}</span>
                </DataGridCell>
                <DataGridCell align="left">
                  <span className="font-medium text-white group-hover:text-violet-300 transition-colors truncate">
                    {wo.title}
                  </span>
                </DataGridCell>
                <DataGridCell hideBelow="md">
                  <span className="text-xs text-[#6480a0] truncate">{propName}</span>
                </DataGridCell>
                <DataGridCell>
                  <StatusBadge value={wo.priority} variant="priority" />
                </DataGridCell>
                <DataGridCell>
                  <StatusBadge value={wo.status} />
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

        {(!workOrders || workOrders.length === 0) && (
          <div className="card mt-2">
            <EmptyState
              title={hasFilters ? 'No work orders match filters' : 'No work orders yet'}
              description={hasFilters ? undefined : 'Create your first work order to start tracking maintenance.'}
              actionLabel={hasFilters ? 'Clear filters' : 'New Work Order'}
              actionHref={hasFilters ? '/work-orders' : '/work-orders/new'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
