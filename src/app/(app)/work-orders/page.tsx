import { getAppContext } from '@/lib/impersonation'
import Link from 'next/link'

function woLabel(num: number | null) {
  return num ? `WO-${String(num).padStart(4, '0')}` : '—'
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-300 border border-red-500/30',
  high:   'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  medium: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  low:    'bg-slate-500/20 text-slate-300 border border-slate-500/30',
}

const STATUS_STYLES: Record<string, string> = {
  open:        'badge-open',
  in_progress: 'badge-in_progress',
  resolved:    'badge-closed',
  closed:      'badge-closed',
}

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

      {/* Work Order Cards */}
      <div className="space-y-2">
        {workOrders?.map(wo => {
          const propName = (wo.properties as { name: string } | null)?.name ?? '—'
          const assigneeName = (wo.assignee as { full_name: string } | null)?.full_name
          return (
            <Link
              key={wo.id}
              href={`/work-orders/${wo.id}`}
              className="card flex items-center gap-4 px-5 py-4 hover:bg-[#1e2d42] hover:border-[#3a5070] transition-all cursor-pointer group"
            >
              {/* WO number + priority indicator */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0 w-16">
                <span className="font-mono text-xs text-[#4a6080]">{woLabel(wo.work_order_number)}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[wo.priority] ?? PRIORITY_STYLES.low}`}>
                  {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                </span>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white group-hover:text-violet-300 transition-colors truncate">
                  {wo.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-[#6480a0]">{propName}</span>
                  <span className="text-[#2a3d58]">·</span>
                  <span className="text-xs text-[#6480a0] capitalize">{wo.category}</span>
                  {assigneeName && (
                    <>
                      <span className="text-[#2a3d58]">·</span>
                      <span className="text-xs text-[#6480a0]">{assigneeName}</span>
                    </>
                  )}
                  {wo.due_date && (
                    <>
                      <span className="text-[#2a3d58]">·</span>
                      <span className="text-xs text-[#6480a0]">Due {wo.due_date}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status + arrow */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`badge ${STATUS_STYLES[wo.status] ?? 'badge-closed'}`}>
                  {wo.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </span>
                <svg className="w-4 h-4 text-[#4a6080] group-hover:text-[#6480a0] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          )
        })}

        {(!workOrders || workOrders.length === 0) && (
          <div className="card p-10 text-center">
            <p className="text-[#6480a0]">
              No work orders found.{' '}
              {hasFilters
                ? <Link href="/work-orders" className="text-violet-400 hover:text-violet-300">Clear filters</Link>
                : <Link href="/work-orders/new" className="text-violet-400 hover:text-violet-300">Create one</Link>}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
