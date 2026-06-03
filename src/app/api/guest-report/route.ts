import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendGuestReportEmail } from '@/lib/email/resend'

type ChecklistItem = { label: string; checked: boolean }

// Guest report submission — no auth required, validated by the stay's guest link token.
export async function POST(req: NextRequest) {
  let body: { token?: string; checklist?: ChecklistItem[]; notes?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { token } = body

  // This endpoint is public/unauthenticated, so clamp the untrusted payload
  // before it ever reaches the database.
  const checklist = (Array.isArray(body.checklist) ? body.checklist : [])
    .slice(0, 100)
    .map((item) => ({
      label: typeof item?.label === 'string' ? item.label.slice(0, 500) : '',
      checked: Boolean(item?.checked),
    }))
    .filter((item) => item.label.length > 0)
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 5000) : undefined

  if (!token) {
    return NextResponse.json({ error: 'Missing token.' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    // Look up the stay by guest link token
    const { data: stay, error: stayError } = await supabase
      .from('stays')
      .select('id, guest_name, property_id, properties(name)')
      .eq('guest_link_token', token)
      .maybeSingle()

    if (stayError || !stay) {
      return NextResponse.json({ error: 'Invalid or expired guest link.' }, { status: 404 })
    }

    // Already submitted? (stay_id is UNIQUE, so at most one report exists.)
    const { data: existing } = await supabase
      .from('guest_reports')
      .select('id')
      .eq('stay_id', stay.id)
      .maybeSingle()

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
      checklist,
      notes: notes?.trim() || null,
      ip_address: ip,
    })

    if (insertError) {
      // 23505 = unique_violation → a report was submitted concurrently.
      if ((insertError as { code?: string }).code === '23505') {
        return NextResponse.json({ error: 'Report already submitted for this stay.' }, { status: 409 })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Audit log
    await supabase.from('audit_log').insert({
      entity_type: 'guest_report',
      entity_id: stay.id,
      action: 'created',
      changed_by: null,
      after_data: { stay_id: stay.id, guest_name: stay.guest_name, checklist_count: checklist.length },
    })

    // Send email notification (best-effort)
    const propertyName = (stay.properties as unknown as { name: string } | null)?.name ?? 'Unknown Property'
    await sendGuestReportEmail({
      stayId: stay.id,
      guestName: stay.guest_name,
      propertyName,
      notes: notes?.trim() || undefined,
    }).catch(console.error)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[guest-report error]', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
