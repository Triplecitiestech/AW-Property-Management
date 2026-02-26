import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PropertyStatusWidget from '@/components/properties/PropertyStatusWidget'
import ChecklistEditor from '@/components/properties/ChecklistEditor'
import DeletePropertyButton from '@/components/properties/DeletePropertyButton'
import QuickNotesEditor from '@/components/properties/QuickNotesEditor'
import AiInstructionsEditor from '@/components/properties/AiInstructionsEditor'
import PropertyContactsEditor from '@/components/properties/PropertyContactsEditor'
import ScrollToContactsButton from '@/components/properties/ScrollToContactsButton'
import { seedDefaultChecklistIfEmpty } from '@/lib/actions/checklist'

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
    supabase.from('service_requests').select('id, title, priority, status, category, created_at').eq('property_id', id).in('status', ['open', 'in_progress']).order('created_at', { ascending: false }).limit(8),
    supabase.from('stays').select('id, guest_name, start_date, end_date, guest_link_token').eq('property_id', id).order('start_date', { ascending: false }).limit(10),
    supabase.from('property_checklist_items').select('id, label, sort_order, is_checked').eq('property_id', id).order('is_checked').order('sort_order'),
    supabase.from('audit_log').select('*, profiles(full_name)').eq('entity_id', id).order('changed_at', { ascending: false }).limit(8),
    supabase.from('property_contacts').select('*').eq('property_id', id).order('sort_order'),
  ])

  if (!property) notFound()

  // Seed default checklist items if none exist (for older properties)
  if (!checklistItems || checklistItems.length === 0) {
    await seedDefaultChecklistIfEmpty(id)
  }

  const ps = Array.isArray(property.property_status) ? property.property_status[0] : property.property_status
  const today = new Date().toISOString().split('T')[0]
  const currentStay = stays?.find(s => s.start_date <= today && s.end_date >= today)
  const upcomingStays = stays?.filter(s => s.start_date > today) ?? []
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const primaryContact = contacts?.find(c => c.is_primary)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/properties" className="text-[#6480a0] hover:text-white transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-white">{property.name}</h1>
            {property.address && <p className="text-[#6480a0] text-sm mt-0.5 truncate">{property.address}</p>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href={`/work-orders/new?property_id=${property.id}`} className="btn-secondary text-sm hidden sm:inline-flex">New Work Order</Link>
          <Link href={`/stays/new?property_id=${property.id}`} className="btn-primary text-sm">Add Stay</Link>
        </div>
      </div>

      {/* AI Summary */}
      {(property as { ai_summary?: string }).ai_summary && (
        <div className="card p-4 border-l-2 border-violet-500/40">
          <p className="text-xs text-[#6480a0] font-medium mb-1 uppercase tracking-wide">AI Property Summary</p>
          <p className="text-sm text-[#94a3b8] leading-relaxed">{(property as { ai_summary?: string }).ai_summary}</p>
        </div>
      )}

      {/* Quick Notes */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="font-semibold text-sm text-white">Quick Notes</h3>
        </div>
        <QuickNotesEditor propertyId={property.id} initialNotes={property.quick_notes ?? ''} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left Column */}
        <div className="space-y-5">

          <div className="card p-5">
            <h3 className="font-semibold mb-4 text-sm text-white">Property Status</h3>
            <PropertyStatusWidget
              propertyId={property.id}
              currentStatus={ps?.status ?? 'clean'}
              currentOccupancy={ps?.occupancy ?? 'unoccupied'}
              currentNotes={ps?.notes ?? ''}
            />
          </div>

          {/* Primary Contact */}
          <div id="primary-contact" className="card p-5">
            <h3 className="font-semibold mb-3 text-sm text-white">Primary Contact</h3>
            {primaryContact ? (
              <div className="space-y-2">
                <p className="font-semibold text-white text-sm">{primaryContact.name}</p>
                <p className="text-xs text-[#6480a0] capitalize">{primaryContact.role}</p>
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
                {primaryContact.notes && <p className="text-xs text-[#50507a] italic">{primaryContact.notes}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#60608a]">No primary contact set.</p>
                <ScrollToContactsButton />
              </div>
            )}
          </div>

          {/* Stays */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3 text-sm text-white">
              {currentStay ? 'Current Stay' : upcomingStays.length > 0 ? 'Next Stay' : 'Stays'}
            </h3>
            {currentStay ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <p className="font-medium text-sm text-white">{currentStay.guest_name}</p>
                </div>
                <p className="text-xs text-[#6480a0]">{currentStay.start_date} → {currentStay.end_date}</p>
                <div className="space-y-1.5">
                  <Link href={`/stays/${currentStay.id}`} className="btn-secondary text-xs w-full justify-center">View Stay</Link>
                  <a href={`${appUrl}/guest/${currentStay.guest_link_token}`} target="_blank" rel="noopener noreferrer"
                     className="btn-secondary text-xs w-full justify-center">Guest Link ↗</a>
                </div>
              </div>
            ) : upcomingStays.length > 0 ? (
              <div className="space-y-2">
                <p className="font-medium text-sm text-white">{upcomingStays[0].guest_name}</p>
                <p className="text-xs text-[#6480a0]">{upcomingStays[0].start_date} → {upcomingStays[0].end_date}</p>
                {upcomingStays.length > 1 && <p className="text-xs text-[#60608a]">+{upcomingStays.length - 1} more upcoming</p>}
                <Link href={`/stays?property_id=${property.id}`} className="btn-secondary text-xs w-full justify-center mt-1">View All</Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-[#60608a]">No active or upcoming stays.</p>
                <Link href={`/stays/new?property_id=${property.id}`} className="btn-secondary text-xs w-full justify-center">Schedule Stay</Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3 text-sm text-white">Quick Actions</h3>
            <div className="space-y-2">
              <Link href={`/work-orders/new?property_id=${property.id}`} className="btn-secondary text-sm w-full justify-center">New Work Order</Link>
              <Link href={`/stays/new?property_id=${property.id}`} className="btn-secondary text-sm w-full justify-center">Schedule Stay</Link>
              <Link href={`/properties/${property.id}/onboard`} className="btn-secondary text-sm w-full justify-center">Edit Setup</Link>
              <DeletePropertyButton propertyId={property.id} propertyName={property.name} />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Open Work Orders */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d42]">
              <h3 className="font-semibold text-sm text-white">Open Work Orders</h3>
              <div className="flex items-center gap-3">
                <Link href={`/work-orders/new?property_id=${property.id}`} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">+ New</Link>
                <Link href={`/work-orders?property_id=${property.id}`} className="text-xs text-[#6480a0] hover:text-white transition-colors">View all →</Link>
              </div>
            </div>
            <div className="divide-y divide-[#1e2d42]">
              {tickets?.map(ticket => (
                <Link key={ticket.id} href={`/work-orders/${ticket.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-[#1a2436] transition-colors group">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">{ticket.title}</p>
                    <p className="text-xs text-[#6480a0] capitalize">{ticket.category}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <span className={`badge badge-${ticket.priority}`}>{ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}</span>
                    <span className={`badge badge-${ticket.status}`}>{ticket.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                  </div>
                </Link>
              ))}
              {(!tickets || tickets.length === 0) && (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-[#6480a0]">No open work orders.</p>
                  <Link href={`/work-orders/new?property_id=${property.id}`} className="text-xs text-violet-400 hover:text-violet-300 mt-1 inline-block">Create one →</Link>
                </div>
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm text-white">Cleaning / Inspection Checklist</h3>
              {checklistItems && checklistItems.filter((i: { is_checked: boolean }) => i.is_checked).length > 0 && (
                <span className="text-xs text-[#6480a0]">
                  {checklistItems.filter((i: { is_checked: boolean }) => i.is_checked).length}/{checklistItems.length} done
                </span>
              )}
            </div>
            <p className="text-xs text-[#6480a0] mb-4">Check items off during cleaning. Reset to start fresh.</p>
            <ChecklistEditor
              propertyId={property.id}
              initialItems={(checklistItems ?? []).map((i: { id: string; label: string; is_checked: boolean }) => ({ id: i.id, label: i.label, is_checked: i.is_checked }))}
            />
          </div>

          {/* Recent Activity */}
          {auditEntries && auditEntries.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3 text-sm text-white">Recent Activity</h3>
              <div className="space-y-2">
                {auditEntries.map(entry => {
                  const actor = (entry.profiles as { full_name: string } | null)?.full_name ?? 'System'
                  const afterData = entry.after_data as Record<string, unknown> | null
                  const detail = afterData?.status ?? afterData?.title ?? ''
                  return (
                    <div key={entry.id} className="flex justify-between text-sm">
                      <span className="text-[#94a3b8]">
                        <span className="font-medium text-white">{actor}</span>
                        {' '}{entry.action} {entry.entity_type.replace(/_/g, ' ')}
                        {detail && <span className="text-[#6480a0]"> · {String(detail)}</span>}
                      </span>
                      <span className="text-[#6480a0] text-xs flex-shrink-0 ml-3">
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

      {/* Property Contacts */}
      <div id="contacts" className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="font-semibold text-sm text-white">Property Contacts</h3>
        </div>
        <PropertyContactsEditor propertyId={property.id} initialContacts={contacts ?? []} />
      </div>

      {/* AI Instructions */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="font-semibold text-sm text-white">AI Agent Instructions</h3>
        </div>
        <AiInstructionsEditor propertyId={property.id} initialInstructions={property.ai_instructions ?? ''} />
      </div>
    </div>
  )
}
