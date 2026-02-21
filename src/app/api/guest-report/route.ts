import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendGuestReportEmail } from '@/lib/email/resend'

// Guest report submission — no auth required, validated by token
export async function POST(req: NextRequest) {
  const { token, checklist, notes } = await req.json()

  if (!token) {
    return NextResponse.json({ error: 'Missing token.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Look up the stay by token
  const { data: stay, error: stayError } = await supabase
    .from('stays')
    .select('id, guest_name, property_id, properties(name)')
    .eq('guest_link_token', token)
    .single()

  if (stayError || !stay) {
    return NextResponse.json({ error: 'Invalid or expired guest link.' }, { status: 404 })
  }

  // Check if already submitted
  const { data: existing } = await supabase
    .from('guest_reports')
    .select('id')
    .eq('stay_id', stay.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Report already submitted for this stay.' }, { status: 409 })
  }

  // Get IP address (best-effort)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || null

  // Insert report
  const { error: insertError } = await supabase.from('guest_reports').insert({
    stay_id: stay.id,
    checklist: checklist ?? [],
    notes: notes?.trim() || null,
    ip_address: ip,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Audit log
  await supabase.from('audit_log').insert({
    entity_type: 'guest_report',
    entity_id: stay.id,
    action: 'created',
    changed_by: null,
    after_data: { stay_id: stay.id, guest_name: stay.guest_name, checklist_count: (checklist ?? []).length },
  })

  // Send email notification
  const propertyName = (stay.properties as { name: string } | null)?.name ?? 'Unknown Property'
  await sendGuestReportEmail({
    stayId: stay.id,
    guestName: stay.guest_name,
    propertyName,
    notes: notes?.trim() || undefined,
  }).catch(console.error)

  return NextResponse.json({ success: true })
}
