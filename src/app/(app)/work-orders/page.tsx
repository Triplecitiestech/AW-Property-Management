import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`badge badge-${priority}`}>{priority}</span>
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>
}

function woLabel(num: number | null) {
  return num ? `WO-${String(num).padStart(4, '0')}` : '—'
}

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string; status?: string; priority?: string; q?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('service_requests')
    .select('*, properties(name), assignee:profiles!service_requests_assignee_id_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (filters.property_id) query = query.eq('property_id', filters.property_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.q) {
    // Search by title OR work order number (e.g. "WO-0001" or "1")
    const numMatch = filters.q.replace(/^wo-?/i, '')
    const num = parseInt(numMatch, 10)
    if (!isNaN(num)) {
      query = query.or(`title.ilike.%${filters.q}%,work_order_number.eq.${num}`)
    } else {
      query = query.ilike('title', `%${filters.q}%`)
    }
  }

  const { data: workOrders } = await query
  const { data: properties } = await supabase.from('properties').select('id, name').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Work Orders</h1>
          <p className="text-gray-500 mt-1">{workOrders?.length ?? 0} work orders</p>
        </div>
        <Link href="/work-orders/new" className="btn-primary">
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
            className="form-input text-sm w-auto flex-1 min-w-[200px]"
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
          {(filters.property_id || filters.status || filters.priority || filters.q) && (
            <Link href="/work-orders" className="text-sm text-gray-500 hover:text-gray-700">Clear</Link>
          )}
        </form>
      </div>

      {/* Work Orders Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">WO#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Work Order</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Property</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Assignee</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Due</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workOrders?.map(wo => (
              <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-gray-400">{woLabel(wo.work_order_number)}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{wo.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{wo.category}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{(wo.properties as {name:string}|null)?.name ?? '—'}</td>
                <td className="px-4 py-3"><PriorityBadge priority={wo.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {(wo.assignee as {full_name:string}|null)?.full_name ?? <span className="text-gray-300">Unassigned</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {wo.due_date ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/work-orders/${wo.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                </td>
              </tr>
            ))}
            {(!workOrders || workOrders.length === 0) && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  No work orders found.{' '}
                  <Link href="/work-orders/new" className="text-blue-600 hover:underline">Create one</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
