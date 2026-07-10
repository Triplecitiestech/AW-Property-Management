import { getAppContext } from '@/lib/impersonation'
import Link from 'next/link'
import LocalDate from '@/components/LocalDate'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  DataGridHeaderCompact,
  DataGridRowCompact,
  DataGridCell,
  type Column,
} from '@/components/ui/DataGrid'

function toLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-[#5a7898] font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-[#3d5a78] mt-1">{sub}</p>}
    </div>
  )
}

/* ─── Column definitions ─────────────────────────────────── */

const PROP_COLS: Column[] = [
  { label: 'Property',     width: '1fr',   align: 'left' },
  { label: 'Open Tickets', width: '100px', align: 'center', hideBelow: 'sm' },
  { label: 'Occupancy',    width: '110px', align: 'center', hideBelow: 'sm' },
  { label: 'Condition',    width: '160px', align: 'center' },
]

const WO_COLS: Column[] = [
  { label: 'Title',    width: '1fr',   align: 'left' },
  { label: 'Property', width: '140px', align: 'center', hideBelow: 'sm' },
  { label: 'Priority', width: '100px', align: 'center' },
  { label: 'Status',   width: '110px', align: 'center' },
]

export default async function DashboardPage() {
  const ctx = await getAppContext()
  const supabase = ctx.supabase
  const today = new Date().toISOString().split('T')[0]

  let propsQuery = supabase.from('properties').select('id, name')
  let statusQuery = supabase.from('property_status').select('*')
  let ticketQuery = supabase.from('service_requests').select('id, title, priority, status, properties(name)').in('status', ['open', 'in_progress']).order('created_at', { ascending: false })
  let stayQuery = supabase.from('stays').select('id, guest_name, start_date, end_date, properties(name)').lte('start_date', today).gte('end_date', today)

  if (ctx.isImpersonating && ctx.propertyIds) {
    const pids = ctx.propertyIds.length > 0 ? ctx.propertyIds : ['00000000-0000-0000-0000-000000000000']
    propsQuery = propsQuery.in('id', pids)
    statusQuery = statusQuery.in('property_id', pids)
    ticketQuery = ticketQuery.in('property_id', pids)
    stayQuery = stayQuery.in('property_id', pids)
  }

  const [
    { data: properties },
    { data: propertyStatuses },
    { data: openTickets },
    { data: activeStays },
    { data: recentAudit },
  ] = await Promise.all([
    propsQuery,
    statusQuery,
    ticketQuery,
    stayQuery,
    supabase.from('audit_log').select('*, profiles(full_name)').order('changed_at', { ascending: false }).limit(10),
  ])

  const needsAttention = propertyStatuses?.filter(s => s.status !== 'clean') ?? []
  const urgentTickets = openTickets?.filter(t => t.priority === 'urgent' || t.priority === 'high') ?? []

  // Build ticket count map per property
  const ticketMap: Record<string, number> = {}
  openTickets?.forEach(t => {
    const pName = (t.properties as unknown as { name: string } | null)?.name
    if (pName) ticketMap[pName] = (ticketMap[pName] ?? 0) + 1
  })

  return (
    <div className="space-y-8">
      <div>
        <h1>Dashboard</h1>
        <p className="text-[#5a7898] mt-1">Overview of your properties and operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Properties" value={properties?.length ?? 0} color="text-white" />
        <StatCard label="Active Stays" value={activeStays?.length ?? 0} sub="checked in today" color="text-violet-400" />
        <StatCard label="Open Tickets" value={openTickets?.length ?? 0} sub={`${urgentTickets.length} high/urgent`} color={urgentTickets.length > 0 ? 'text-rose-400' : 'text-white'} />
        <StatCard label="Need Attention" value={needsAttention.length} sub="properties with issues" color={needsAttention.length > 0 ? 'text-rose-400' : 'text-emerald-400'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Properties ──────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Properties</h2>
            <Link href="/properties" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">View all</Link>
          </div>
          <DataGridHeaderCompact columns={PROP_COLS} />
          <div>
            {properties?.map(property => {
              const ps = propertyStatuses?.find(s => s.property_id === property.id)
              const count = ticketMap[property.name] ?? 0
              return (
                <DataGridRowCompact key={property.id} href={`/properties/${property.id}`} columns={PROP_COLS}>
                  <DataGridCell align="left">
                    <span className="font-medium text-sm text-white group-hover:text-violet-300 transition-colors truncate">
                      {property.name}
                    </span>
                  </DataGridCell>
                  <DataGridCell hideBelow="sm">
                    {count > 0 ? (
                      <span className="text-xs text-rose-300">{count}</span>
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
                </DataGridRowCompact>
              )
            })}
            {(!properties || properties.length === 0) && (
              <div className="px-5 py-8 text-center text-sm text-[#4a6080]">
                No properties yet.{' '}
                <Link href="/properties/new" className="text-violet-400 hover:text-violet-300">Add one</Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Open Work Orders ────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Open Work Orders</h2>
            <Link href="/work-orders" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">View all</Link>
          </div>
          <DataGridHeaderCompact columns={WO_COLS} />
          <div>
            {openTickets?.slice(0, 6).map(ticket => (
              <DataGridRowCompact key={ticket.id} href={`/work-orders/${ticket.id}`} columns={WO_COLS}>
                <DataGridCell align="left">
                  <span className="font-medium text-sm text-white group-hover:text-violet-300 transition-colors truncate">
                    {ticket.title}
                  </span>
                </DataGridCell>
                <DataGridCell hideBelow="sm">
                  <span className="text-xs text-[#6480a0] truncate">
                    {(ticket.properties as unknown as { name: string } | null)?.name ?? '—'}
                  </span>
                </DataGridCell>
                <DataGridCell>
                  <StatusBadge value={ticket.priority} variant="priority" />
                </DataGridCell>
                <DataGridCell>
                  <StatusBadge value={ticket.status} />
                </DataGridCell>
              </DataGridRowCompact>
            ))}
            {(!openTickets || openTickets.length === 0) && (
              <div className="px-5 py-8 text-center text-sm text-[#4a6080]">
                No open work orders.{' '}
                <Link href="/work-orders/new" className="text-violet-400 hover:text-violet-300">Create one</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-[#2a3d58]">
          <h2 className="text-base font-semibold text-white">Recent Activity</h2>
        </div>
        <div className="divide-y divide-[#1e2d42]">
          {recentAudit?.map(entry => {
            const actor = (entry.profiles as { full_name: string } | null)?.full_name ?? 'Guest'
            const afterData = entry.after_data as Record<string, unknown> | null
            const detail = afterData?.name ?? afterData?.title ?? afterData?.guest_name ?? afterData?.status ?? ''
            return (
              <div key={entry.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#94a3b8]">
                    <span className="font-medium text-white">{actor}</span>
                    {' '}{entry.action}{' '}
                    <span className="text-[#6480a0]">{toLabel(entry.entity_type)}</span>
                    {detail && <span className="text-[#6480a0]">: {String(detail)}</span>}
                  </p>
                </div>
                <p className="text-xs text-[#4a6080] ml-4 flex-shrink-0">
                  <LocalDate iso={entry.changed_at} />
                </p>
              </div>
            )
          })}
          {(!recentAudit || recentAudit.length === 0) && (
            <div className="px-5 py-8 text-center text-sm text-[#4a6080]">No activity yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
