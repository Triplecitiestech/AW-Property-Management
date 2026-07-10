import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function GuestStayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const supabase = createServiceClient()

  const { data: stay, error } = await supabase
    .from('stays')
    .select(`
      id, guest_name, start_date, end_date, notes,
      wifi_name, wifi_password, door_code, host_instructions,
      property_id,
      properties(name, address, quick_notes, description)
    `)
    .eq('guest_link_token', token)
    .single()

  if (error || !stay) notFound()

  const property = stay.properties as {
    name: string
    address: string
    quick_notes: string | null
    description: string | null
  } | null

  const twilioPhone = process.env.TWILIO_PHONE_NUMBER ?? ''

  return (
    <div className="min-h-screen bg-[#0f1829] py-8 px-4">
      <div className="max-w-xl mx-auto space-y-5">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-violet-600 rounded-2xl mb-4 shadow-lg shadow-violet-900/50">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">{property?.name ?? 'Your Stay'}</h1>
          {property?.address && (
            <p className="text-[#6480a0] text-sm mt-1">{property.address}</p>
          )}
        </div>

        {/* Guest Info */}
        <div className="bg-[#1a2436] border border-[#2a3d58] rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-white">{stay.guest_name}</p>
              <p className="text-sm text-[#6480a0]">
                {stay.start_date} → {stay.end_date}
              </p>
            </div>
          </div>
        </div>

        {/* Wi-Fi Info */}
        {(stay.wifi_name || stay.wifi_password) && (
          <div className="bg-[#1a2436] border border-[#2a3d58] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <h2 className="font-semibold text-white text-sm">Wi-Fi</h2>
            </div>
            <div className="space-y-2">
              {stay.wifi_name && (
                <div className="flex items-center justify-between bg-[#0f1829] rounded-xl px-4 py-3">
                  <span className="text-xs text-[#6480a0]">Network</span>
                  <span className="font-mono font-medium text-white text-sm">{stay.wifi_name}</span>
                </div>
              )}
              {stay.wifi_password && (
                <div className="flex items-center justify-between bg-[#0f1829] rounded-xl px-4 py-3">
                  <span className="text-xs text-[#6480a0]">Password</span>
                  <span className="font-mono font-medium text-white text-sm">{stay.wifi_password}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Door Code */}
        {stay.door_code && (
          <div className="bg-[#1a2436] border border-[#2a3d58] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <h2 className="font-semibold text-white text-sm">Door Code</h2>
            </div>
            <div className="bg-[#0f1829] rounded-xl px-4 py-3 text-center">
              <span className="font-mono text-2xl font-bold text-emerald-400 tracking-widest">{stay.door_code}</span>
            </div>
          </div>
        )}

        {/* Host Instructions */}
        {stay.host_instructions && (
          <div className="bg-[#1a2436] border border-[#2a3d58] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="font-semibold text-white text-sm">Host Instructions</h2>
            </div>
            <p className="text-sm text-[#94a3b8] whitespace-pre-wrap leading-relaxed">{stay.host_instructions}</p>
          </div>
        )}

        {/* Property Notes (fallback when stay-specific info not set) */}
        {property?.quick_notes && !stay.wifi_name && !stay.door_code && !stay.host_instructions && (
          <div className="bg-[#1a2436] border border-[#2a3d58] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="font-semibold text-white text-sm">Property Info</h2>
            </div>
            <p className="text-sm text-[#94a3b8] whitespace-pre-wrap leading-relaxed">{property.quick_notes}</p>
          </div>
        )}

        {/* Stay Notes */}
        {stay.notes && (
          <div className="bg-[#1a2436] border border-[#2a3d58] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <h2 className="font-semibold text-white text-sm">Notes from Host</h2>
            </div>
            <p className="text-sm text-[#94a3b8] whitespace-pre-wrap leading-relaxed">{stay.notes}</p>
          </div>
        )}

        {/* Contact Host */}
        <div className="bg-[#1a2436] border border-[#2a3d58] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2 className="font-semibold text-white text-sm">Need Help?</h2>
          </div>
          <p className="text-sm text-[#6480a0] mb-3">
            Text or call us anytime for questions, maintenance requests, or anything you need during your stay.
          </p>
          {twilioPhone ? (
            <a
              href={`sms:${twilioPhone}`}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Text Us: {twilioPhone}
            </a>
          ) : (
            <p className="text-xs text-[#4a6080] italic">Contact info will be provided upon check-in.</p>
          )}
        </div>

        <p className="text-center text-xs text-[#4a6080] pb-4">
          Powered by Smart Sumai Property Management
        </p>
      </div>
    </div>
  )
}
