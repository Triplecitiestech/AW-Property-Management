import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PropertyStatusWidget from '@/components/properties/PropertyStatusWidget'
import ChecklistEditor from '@/components/properties/ChecklistEditor'
import DeletePropertyButton from '@/components/properties/DeletePropertyButton'
import QuickNotesEditor from '@/components/properties/QuickNotesEditor'
import AiInstructionsEditor from '@/components/properties/AiInstructionsEditor'
import PropertyContactsEditor from '@/components/properties/PropertyContactsEditor'

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: property },
    { data: tickets },
    { data: stays },
    { data: checklistItems },
    { data: auditEntries },
    { data: contacts },
  ] = await Promise.all([
    supabase.from('properties').select('*, property_status(*)').eq('id', id).single(),
    supabase.from('service_requests').select('id, title, priority, status, category, created_at').eq('property_id', id).order('created_at', { ascending: false }),
    supabase.from('stays').select('id, guest_name, start_date, end_date, guest_link_token').eq('property_id', id).order('start_date', { ascending: false }).limit(5),
    supabase.from('property_checklist_items').select('label, sort_order').eq('property_id', id).order('sort_order'),
    supabase.from('audit_log').select('*, profiles(full_name)').eq('entity_id', id).order('changed_at', { ascending: false }).limit(5),
    supabase.from('property_contacts').select('*').eq('property_id', id).order('sort_order'),
  ])

  if (!property) notFound()

  const ps = Array.isArray(property.property_status)
    ? property.property_status[0]
    : property.property_status

  const today = new Date().toISOString().split('T')[0]
  const currentStay = stays?.find(s => s.start_date <= today && s.end_date >= today)
  const upcomingStays = stays?.filter(s => s.start_date > today) ?? []
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const primaryContact = contacts?.find(c => c.is_primary)

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/properties" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate">{property.name}</h1>
            {property.address && (
              <p className="text-gray-500 text-sm mt-0.5 truncate">{property.address}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href={`/tickets/new?property_id=${property.id}`} className="btn-secondary text-sm hidden sm:inline-flex">
            New Ticket
          </Link>
          <Link href={`/stays/new?property_id=${property.id}`} className="btn-primary text-sm">
            Add Stay
          </Link>
        </div>
      </div>

      {/* ── Quick Notes ─────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="font-semibold text-sm">Overview / Notes</h3>
        </div>
        <QuickNotesEditor
          propertyId={property.id}
          initialNotes={property.quick_notes ?? ''}
        />
      </div>

      {/* ── Main Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ──────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Status Widget */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4 text-sm">Property Status</h3>
            <PropertyStatusWidget
              propertyId={property.id}
              currentStatus={ps?.status ?? 'clean'}
              currentOccupancy={ps?.occupancy ?? 'unoccupied'}
              currentNotes={ps?.notes ?? ''}
            />
          </div>

          {/* Primary Contact */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3 text-sm">Primary Contact</h3>
            {primaryContact ? (
              <div className="space-y-1.5">
                <p className="font-semibold text-white text-sm">{primaryContact.name}</p>
                {primaryContact.phone && (
                  <a href={`tel:${primaryContact.phone}`} className="flex items-center gap-2 text-xs text-[#8080aa] hover:text-white transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {primaryContact.phone}
                  </a>
                )}
                {primaryContact.email && (
                  <a href={`mailto:${primaryContact.email}`} className="flex items-center gap-2 text-xs text-[#8080aa] hover:text-white transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {primaryContact.email}
                  </a>
                )}
                {primaryContact.notes && (
                  <p className="text-xs text-[#50507a] italic">{primaryContact.notes}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#60608a]">No primary contact set. Add one in the contacts section below.</p>
            )}
          </div>

          {/* Current Stay */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3 text-sm">Current Stay</h3>
            {currentStay ? (
              <div>
                <p className="font-medium text-sm text-white">{currentStay.guest_name}</p>
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
                    Guest Link ↗
                  </a>
                </div>
              </div>
            ) : upcomingStays.length > 0 ? (
              <div>
                <p className="text-xs text-[#60608a] mb-2">No active stay. Next up:</p>
                <p className="font-medium text-sm text-white">{upcomingStays[0].guest_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{upcomingStays[0].start_date} → {upcomingStays[0].end_date}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No active or upcoming stays.</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3 text-sm">Actions</h3>
            <div className="space-y-2">
              <Link href={`/tickets/new?property_id=${property.id}`} className="btn-secondary text-sm w-full justify-center">
                Create Ticket
              </Link>
              <Link href={`/stays/new?property_id=${property.id}`} className="btn-secondary text-sm w-full justify-center">
                Schedule Stay
              </Link>
              <Link href={`/properties/${property.id}/onboard`} className="btn-secondary text-sm w-full justify-center">
                Edit Setup
              </Link>
              <DeletePropertyButton propertyId={property.id} propertyName={property.name} />
            </div>
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Upcoming Stays */}
          {upcomingStays.length > 0 && (
            <div className="card">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Upcoming Stays</h3>
                <Link href={`/stays?property_id=${property.id}`} className="text-xs text-blue-600 hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-gray-100">
                {upcomingStays.slice(0, 3).map(stay => {
                  const nights = Math.ceil((new Date(stay.end_date).getTime() - new Date(stay.start_date).getTime()) / 86400000)
                  return (
                    <Link key={stay.id} href={`/stays/${stay.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{stay.guest_name}</p>
                        <p className="text-xs text-gray-400">{stay.start_date} → {stay.end_date} · {nights} night{nights !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="badge badge-in_progress text-xs">Upcoming</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Service Tickets */}
          <div className="card">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Service Tickets</h3>
              <Link href={`/tickets?property_id=${property.id}`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {tickets?.slice(0, 5).map(ticket => (
                <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-400 capitalize">{ticket.category}</p>
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
              <h3 className="font-semibold text-sm">Recent Stays</h3>
              <Link href={`/stays?property_id=${property.id}`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {stays?.filter(s => s.start_date <= today).slice(0, 4).map(stay => (
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
              {(!stays || stays.filter(s => s.start_date <= today).length === 0) && (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No past stays recorded.</div>
              )}
            </div>
          </div>

          {/* Cleaning / Inspection Checklist */}
          <div className="card p-5">
            <h3 className="font-semibold mb-1 text-sm">Cleaning / Inspection Checklist</h3>
            <p className="text-xs text-gray-500 mb-4">Items for cleaning teams and property managers to verify between stays.</p>
            <ChecklistEditor
              propertyId={property.id}
              initialItems={checklistItems?.map(i => i.label) ?? []}
            />
          </div>

          {/* Recent Activity */}
          {auditEntries && auditEntries.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3 text-sm">Recent Activity</h3>
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
                      <span className="text-gray-400 text-xs flex-shrink-0 ml-3">
                        {new Date(entry.changed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Property Contacts (full width) ───────────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="font-semibold text-sm">Property Contacts</h3>
        </div>
        <PropertyContactsEditor
          propertyId={property.id}
          initialContacts={contacts ?? []}
        />
      </div>

      {/* ── AI Message Instructions (full width) ─────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="font-semibold text-sm">AI Agent Instructions</h3>
        </div>
        <AiInstructionsEditor
          propertyId={property.id}
          initialInstructions={property.ai_instructions ?? ''}
        />
      </div>
    </div>
  )
}
