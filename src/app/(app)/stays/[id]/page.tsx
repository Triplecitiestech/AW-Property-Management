import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteStayButton from '@/components/stays/DeleteStayButton'
import CopyLinkButton from '@/components/stays/CopyLinkButton'

export default async function StayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: stay },
    { data: guestReport },
    { data: auditEntries },
  ] = await Promise.all([
    supabase.from('stays').select('*, properties(id, name)').eq('id', id).single(),
    supabase.from('guest_reports').select('*').eq('stay_id', id).single(),
    supabase.from('audit_log').select('action, changed_at, after_data, is_ai_action, profiles(full_name)').eq('entity_id', id).order('changed_at', { ascending: false }).limit(10),
  ])

  if (!stay) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const guestLink = `${appUrl}/guest/${stay.guest_link_token}`
  const today = new Date().toISOString().split('T')[0]
  const nights = Math.ceil((new Date(stay.end_date).getTime() - new Date(stay.start_date).getTime()) / (1000 * 60 * 60 * 24))

  let stayStatus = 'upcoming'
  if (stay.end_date < today) stayStatus = 'past'
  else if (stay.start_date <= today) stayStatus = 'active'

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/stays" className="text-[#6480a0] hover:text-[#94a3b8] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{stay.guest_name}</h1>
          <p className="text-[#6480a0] text-sm">{(stay.properties as {name:string}|null)?.name} · {stay.start_date} → {stay.end_date} ({nights} night{nights !== 1 ? 's' : ''})</p>
        </div>
        <span className={`badge ml-auto ${
          stayStatus === 'active' ? 'badge-open' : stayStatus === 'past' ? 'badge-closed' : 'badge-in_progress'
        }`}>
          {stayStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stay Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <h3 className="font-semibold text-white mb-4">Stay Details</h3>
            <form action={async (formData) => {
              'use server'
              const { updateStay } = await import('@/lib/actions/stays')
              await updateStay(id, formData)
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Guest Name</label>
                  <input name="guest_name" type="text" className="form-input" defaultValue={stay.guest_name} required />
                </div>
                <div>
                  <label className="form-label">Guest Email</label>
                  <input name="guest_email" type="email" className="form-input" defaultValue={stay.guest_email ?? ''} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Check-in</label>
                  <input name="start_date" type="date" className="form-input" defaultValue={stay.start_date} required />
                </div>
                <div>
                  <label className="form-label">Check-out</label>
                  <input name="end_date" type="date" className="form-input" defaultValue={stay.end_date} required />
                </div>
              </div>
              <div>
                <label className="form-label">Notes for Your Guest</label>
                <p className="text-xs text-[#6480a0] mb-1">Shown on the guest welcome page. Leave blank and it won&apos;t appear.</p>
                <textarea name="notes" className="form-input" rows={3} defaultValue={stay.notes ?? ''}
                  placeholder="e.g. WiFi: NetworkName / Password123 · Door code: 4521 · Quiet hours after 10pm…" />
              </div>
              <button type="submit" className="btn-primary text-sm">Save Changes</button>
            </form>
          </div>

          {/* Recent Activity */}
          {auditEntries && auditEntries.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-white mb-3 text-sm">Recent Activity</h3>
              <div className="space-y-2">
                {auditEntries.map((entry, i) => {
                  const actor = (entry.profiles as unknown as {full_name:string}|null)?.full_name ?? 'System'
                  const isAi = !!(entry as Record<string,unknown>).is_ai_action
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        {isAi && <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">AI</span>}
                        <span className="font-medium text-[#e2e8f0]">{actor}</span>
                        <span className="text-[#6480a0]">{entry.action} this stay</span>
                      </div>
                      <span className="text-xs text-[#4a6080]">{new Date(entry.changed_at).toLocaleDateString()}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Guest Report */}
          <div className="card p-6">
            <h3 className="font-semibold text-white mb-3">Guest Report</h3>
            {guestReport ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  <p className="text-sm text-teal-400 font-medium">Report submitted on {new Date(guestReport.submitted_at).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  {(guestReport.checklist as Array<{label: string; checked: boolean}>).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className={item.checked ? 'text-teal-400' : 'text-[#6480a0]'}>
                        {item.checked ? '✓' : '✗'}
                      </span>
                      <span className={item.checked ? 'text-[#94a3b8]' : 'text-[#6480a0]'}>{item.label}</span>
                    </div>
                  ))}
                </div>
                {guestReport.notes && (
                  <div className="mt-3 p-3 bg-[#0f1829] rounded-lg border border-[#1e2d42]">
                    <p className="text-xs font-medium text-[#6480a0] mb-1">Guest Notes</p>
                    <p className="text-sm text-[#94a3b8]">{guestReport.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#6480a0]">No guest report submitted yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Guest Welcome Page Link */}
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-1">Guest Welcome Page</h3>
            <p className="text-xs text-[#6480a0] mb-3">Share this link with your guest — they&apos;ll see property info, door codes, WiFi, and can submit a checkout report.</p>
            <div className="p-3 bg-[#0f1829] rounded-lg mb-3 border border-[#1e2d42]">
              <p className="text-xs text-[#6480a0] break-all">{guestLink}</p>
            </div>
            <div className="space-y-2">
              <a
                href={guestLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm w-full justify-center flex items-center gap-2"
              >
                Open Guest Welcome Page
              </a>
              <CopyLinkButton link={guestLink} />
            </div>
          </div>

          {/* Remove Stay */}
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-1">Remove Stay</h3>
            <p className="text-xs text-[#6480a0] mb-3">Permanently delete this stay and all associated reports.</p>
            <DeleteStayButton stayId={stay.id} guestName={stay.guest_name} />
          </div>
        </div>
      </div>
    </div>
  )
}
