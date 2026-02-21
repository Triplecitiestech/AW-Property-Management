import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import GuestReportForm from '@/components/guest/GuestReportForm'
import { DEFAULT_CHECKLIST_LABELS } from '@/lib/checklist-defaults'

export default async function GuestReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Use service client to look up stay by token (no user auth)
  const supabase = createServiceClient()

  const { data: stay, error } = await supabase
    .from('stays')
    .select('id, guest_name, start_date, end_date, property_id, properties(name)')
    .eq('guest_link_token', token)
    .single()

  if (error || !stay) notFound()

  // Check if already submitted
  const { data: existingReport } = await supabase
    .from('guest_reports')
    .select('id, submitted_at')
    .eq('stay_id', stay.id)
    .single()

  // Get property-specific checklist or defaults
  const { data: customItems } = await supabase
    .from('property_checklist_items')
    .select('label')
    .eq('property_id', stay.property_id)
    .order('sort_order')

  const checklistLabels = customItems && customItems.length > 0
    ? customItems.map((i: { label: string }) => i.label)
    : DEFAULT_CHECKLIST_LABELS

  const propertyName = (stay.properties as { name: string } | null)?.name ?? 'the property'

  if (existingReport) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="card p-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Report Already Submitted</h1>
            <p className="text-gray-500 text-sm">
              Your guest report for {propertyName} was submitted on{' '}
              {new Date(existingReport.submitted_at).toLocaleDateString()}.
            </p>
            <p className="text-gray-400 text-xs mt-4">Thank you for your feedback!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{propertyName}</h1>
          <p className="text-gray-500 text-sm mt-1">Guest Checklist & Report</p>
        </div>

        <div className="card p-6 mb-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">{stay.guest_name}</p>
              <p className="text-xs text-gray-500">{stay.start_date} → {stay.end_date}</p>
            </div>
          </div>

          <GuestReportForm token={token} checklistLabels={checklistLabels} stayId={stay.id} />
        </div>

        <p className="text-center text-xs text-gray-400">
          Powered by AW Property Management
        </p>
      </div>
    </div>
  )
}
