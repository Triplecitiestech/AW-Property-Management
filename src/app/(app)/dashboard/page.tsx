import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${status}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`badge badge-${priority}`}>{priority}</span>
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: properties },
    { data: propertyStatuses },
    { data: openTickets },
    { data: activeStays },
    { data: recentAudit },
  ] = await Promise.all([
    supabase.from('properties').select('id, name'),
    supabase.from('property_status').select('*'),
    supabase.from('service_requests').select('id, title, priority, status, properties(name)').in('status', ['open', 'in_progress']).order('created_at', { ascending: false }),
    supabase.from('stays').select('id, guest_name, start_date, end_date, properties(name)').lte('start_date', today).gte('end_date', today),
    supabase.from('audit_log').select('*, profiles(full_name)').order('changed_at', { ascending: false }).limit(10),
  ])

  const needsAttention = propertyStatuses?.filter(s => s.status !== 'clean') ?? []
  const urgentTickets = openTickets?.filter(t => t.priority === 'urgent' || t.priority === 'high') ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1>Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your properties and operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Properties" value={properties?.length ?? 0} color="text-gray-900" />
        <StatCard label="Active Stays" value={activeStays?.length ?? 0} sub="checked in today" color="text-blue-600" />
        <StatCard label="Open Tickets" value={openTickets?.length ?? 0} sub={`${urgentTickets.length} high/urgent`} color={urgentTickets.length > 0 ? 'text-red-600' : 'text-gray-900'} />
        <StatCard label="Need Attention" value={needsAttention.length} sub="properties with issues" color={needsAttention.length > 0 ? 'text-orange-600' : 'text-green-600'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property Status Overview */}
        <div className="card">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold">Properties</h2>
            <Link href="/properties" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {properties?.map(property => {
              const ps = propertyStatuses?.find(s => s.property_id === property.id)
              const propTickets = openTickets?.filter(t => (t.properties as unknown as {name:string}|null)?.name === property.name)
              return (
                <Link key={property.id} href={`/properties/${property.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{property.name}</p>
                    {propTickets && propTickets.length > 0 && (
                      <p className="text-xs text-gray-400">{propTickets.length} open ticket{propTickets.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {ps && <StatusBadge status={ps.occupancy} />}
                    {ps && <StatusBadge status={ps.status} />}
                  </div>
                </Link>
              )
            })}
            {(!properties || properties.length === 0) && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                No properties yet.{' '}
                <Link href="/properties/new" className="text-blue-600 hover:underline">Add one</Link>
              </div>
            )}
          </div>
        </div>

        {/* Open Tickets */}
        <div className="card">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold">Open Tickets</h2>
            <Link href="/tickets" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {openTickets?.slice(0, 6).map(ticket => (
              <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{ticket.title}</p>
                  <p className="text-xs text-gray-400">{(ticket.properties as unknown as {name:string}|null)?.name}</p>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </Link>
            ))}
            {(!openTickets || openTickets.length === 0) && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                No open tickets.{' '}
                <Link href="/tickets/new" className="text-blue-600 hover:underline">Create one</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentAudit?.map(entry => {
            const actor = (entry.profiles as {full_name:string}|null)?.full_name ?? 'Guest'
            const afterData = entry.after_data as Record<string, unknown> | null
            const detail = afterData?.name ?? afterData?.title ?? afterData?.guest_name ?? afterData?.status ?? ''
            return (
              <div key={entry.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{actor}</span>
                    {' '}{entry.action}{' '}
                    <span className="text-gray-500">{entry.entity_type.replace(/_/g, ' ')}</span>
                    {detail && <span className="text-gray-500">: {String(detail)}</span>}
                  </p>
                </div>
                <p className="text-xs text-gray-400 ml-4 flex-shrink-0">
                  {new Date(entry.changed_at).toLocaleDateString()}
                </p>
              </div>
            )
          })}
          {(!recentAudit || recentAudit.length === 0) && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No activity yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
