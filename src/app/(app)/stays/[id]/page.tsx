import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteStayButton from '@/components/stays/DeleteStayButton'

export default async function StayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: stay },
    { data: guestReport },
    { data: properties },
  ] = await Promise.all([
    supabase.from('stays').select('*, properties(id, name)').eq('id', id).single(),
    supabase.from('guest_reports').select('*').eq('stay_id', id).single(),
    supabase.from('properties').select('id, name').order('name'),
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
        <Link href="/stays" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1>{stay.guest_name}</h1>
          <p className="text-gray-500 text-sm">{(stay.properties as {name:string}|null)?.name} · {stay.start_date} → {stay.end_date} ({nights} nights)</p>
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
            <h3 className="font-semibold mb-4">Stay Details</h3>
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
                <label className="form-label">Notes</label>
                <textarea name="notes" className="form-input" rows={3} defaultValue={stay.notes ?? ''} />
              </div>
              <button type="submit" className="btn-primary text-sm">Save Changes</button>
            </form>
          </div>

          {/* Guest Report */}
          <div className="card p-6">
            <h3 className="font-semibold mb-3">Guest Report</h3>
            {guestReport ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm text-green-700 font-medium">Report submitted on {new Date(guestReport.submitted_at).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  {(guestReport.checklist as Array<{label: string; checked: boolean}>).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className={item.checked ? 'text-green-600' : 'text-gray-400'}>
                        {item.checked ? '✓' : '✗'}
                      </span>
                      <span className={item.checked ? 'text-gray-700' : 'text-gray-400'}>{item.label}</span>
                    </div>
                  ))}
                </div>
                {guestReport.notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 mb-1">Guest Notes</p>
                    <p className="text-sm text-gray-700">{guestReport.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No guest report submitted yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Guest Link */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Guest Link</h3>
            <p className="text-xs text-gray-500 mb-3">Share this link with the guest to access their checklist.</p>
            <div className="p-3 bg-gray-50 rounded-lg mb-3">
              <p className="text-xs text-gray-600 break-all">{guestLink}</p>
            </div>
            <div className="space-y-2">
              <a
                href={guestLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm w-full justify-center"
              >
                Open Guest Checklist
              </a>
              <button
                onClick={undefined}
                className="btn-secondary text-sm w-full justify-center"
                id="copy-link"
                type="button"
              >
                Copy Link
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card p-5 border-red-200">
            <h3 className="font-semibold text-red-700 mb-3">Danger Zone</h3>
            <DeleteStayButton stayId={stay.id} guestName={stay.guest_name} />
          </div>
        </div>
      </div>
    </div>
  )
}
