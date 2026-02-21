import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PropertyStatusWidget from '@/components/properties/PropertyStatusWidget'
import ChecklistEditor from '@/components/properties/ChecklistEditor'
import DeletePropertyButton from '@/components/properties/DeletePropertyButton'

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: property },
    { data: tickets },
    { data: stays },
    { data: checklistItems },
    { data: auditEntries },
  ] = await Promise.all([
    supabase.from('properties').select('*, property_status(*)').eq('id', id).single(),
    supabase.from('service_requests').select('id, title, priority, status, category, created_at').eq('property_id', id).order('created_at', { ascending: false }),
    supabase.from('stays').select('id, guest_name, start_date, end_date, guest_link_token').eq('property_id', id).order('start_date', { ascending: false }).limit(5),
    supabase.from('property_checklist_items').select('label, sort_order').eq('property_id', id).order('sort_order'),
    supabase.from('audit_log').select('*, profiles(full_name)').eq('entity_id', id).order('changed_at', { ascending: false }).limit(5),
  ])

  if (!property) notFound()

  const ps = Array.isArray(property.property_status)
    ? property.property_status[0]
    : property.property_status

  const today = new Date().toISOString().split('T')[0]
  const currentStay = stays?.find(s => s.start_date <= today && s.end_date >= today)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/properties" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1>{property.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{property.address}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/tickets/new?property_id=${property.id}`} className="btn-secondary text-sm">
            New Ticket
          </Link>
          <Link href={`/stays/new?property_id=${property.id}`} className="btn-primary text-sm">
            Add Stay
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Status + current stay */}
        <div className="lg:col-span-1 space-y-4">
          {/* Status Widget */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Property Status</h3>
            <PropertyStatusWidget propertyId={property.id} currentStatus={ps?.status ?? 'clean'} currentOccupancy={ps?.occupancy ?? 'unoccupied'} currentNotes={ps?.notes ?? ''} />
          </div>

          {/* Current Stay */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Current Stay</h3>
            {currentStay ? (
              <div>
                <p className="font-medium text-sm">{currentStay.guest_name}</p>
                <p className="text-xs text-gray-500 mt-1">{currentStay.start_date} → {currentStay.end_date}</p>
                <div className="mt-3 space-y-2">
                  <Link href={`/stays/${currentStay.id}`} className="btn-secondary text-xs w-full justify-center">
                    View Stay
                  </Link>
                  <a
                    href={`${appUrl}/guest/${currentStay.guest_link_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-xs w-full justify-center"
                  >
                    Guest Link
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No active stay</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Actions</h3>
            <div className="space-y-2">
              <Link href={`/tickets/new?property_id=${property.id}`} className="btn-secondary text-sm w-full justify-center">
                Create Ticket
              </Link>
              <DeletePropertyButton propertyId={property.id} propertyName={property.name} />
            </div>
          </div>
        </div>

        {/* Right: Tickets + Stays + Checklist */}
        <div className="lg:col-span-2 space-y-6">
          {/* Open Tickets */}
          <div className="card">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold">Service Tickets</h3>
              <Link href={`/tickets?property_id=${property.id}`} className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {tickets?.slice(0, 5).map(ticket => (
                <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-400">{ticket.category}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
                    <span className={`badge badge-${ticket.status}`}>{ticket.status.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
              {(!tickets || tickets.length === 0) && (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No tickets for this property.</div>
              )}
            </div>
          </div>

          {/* Recent Stays */}
          <div className="card">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold">Recent Stays</h3>
              <Link href={`/stays?property_id=${property.id}`} className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {stays?.map(stay => (
                <Link key={stay.id} href={`/stays/${stay.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{stay.guest_name}</p>
                    <p className="text-xs text-gray-400">{stay.start_date} → {stay.end_date}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
              {(!stays || stays.length === 0) && (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No stays recorded.</div>
              )}
            </div>
          </div>

          {/* Guest Checklist Editor */}
          <div className="card p-5">
            <h3 className="font-semibold mb-1">Guest Checklist Items</h3>
            <p className="text-sm text-gray-500 mb-4">Customize the checklist shown to guests for this property.</p>
            <ChecklistEditor
              propertyId={property.id}
              initialItems={checklistItems?.map(i => i.label) ?? []}
            />
          </div>

          {/* Recent Audit */}
          {auditEntries && auditEntries.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {auditEntries.map(entry => {
                  const actor = (entry.profiles as {full_name:string}|null)?.full_name ?? 'System'
                  const afterData = entry.after_data as Record<string, unknown> | null
                  const detail = afterData?.status ?? afterData?.title ?? ''
                  return (
                    <div key={entry.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        <span className="font-medium">{actor}</span>
                        {' '}{entry.action} {entry.entity_type.replace(/_/g, ' ')}
                        {detail && <span className="text-gray-400"> · {String(detail)}</span>}
                      </span>
                      <span className="text-gray-400 text-xs">{new Date(entry.changed_at).toLocaleDateString()}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
