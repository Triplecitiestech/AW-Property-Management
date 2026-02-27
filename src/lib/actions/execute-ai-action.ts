/**
 * Shared AI action executor used by both the web chat route and the SMS webhook.
 * Handles create_work_order, create_stay, update_status, create_contact.
 * Returns a human-readable result string.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { AiSmsAction } from '@/lib/sms/ai-handler'
import { sendNewTicketEmail } from '@/lib/email/resend'

// Map AI categories to valid DB ticket_category enum values
const CATEGORY_MAP: Record<string, string> = {
  plumbing: 'plumbing',
  electrical: 'electrical',
  hvac: 'hvac',
  cleaning: 'cleaning',
  maintenance: 'maintenance',
  landscaping: 'landscaping',
  supplies: 'supplies',
  other: 'other',
}

function mapCategory(cat: string): string {
  return CATEGORY_MAP[cat?.toLowerCase()] ?? 'other'
}

function formatTimestamp(d = new Date()): string {
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export async function executeAiAction(
  action: AiSmsAction,
  ownerId: string,
  source: 'web' | 'sms',
  originalMessage: string,
  appUrl: string,
): Promise<{ success: boolean; detail?: string; workOrderId?: string }> {
  const svc = createServiceClient()

  if (action.type === 'create_work_order') {
    const { data: properties } = await svc
      .from('properties')
      .select('id, name')
      .eq('owner_id', ownerId)
      .ilike('name', `%${action.property_name}%`)
      .limit(1)

    if (!properties?.length) {
      return { success: false, detail: `Property not found: ${action.property_name}` }
    }
    const property = properties[0]
    const category = mapCategory(action.category)

    const { data: ticket, error } = await svc
      .from('service_requests')
      .insert({
        property_id: property.id,
        title: action.title,
        category,
        priority: action.priority,
        status: 'open',
        source,
        created_by: ownerId,
        description: `Created by Smart Sumai AI via ${source === 'sms' ? 'SMS' : 'web chat'}.\n\nOriginal request: "${originalMessage}"`,
      })
      .select('id, work_order_number')
      .single()

    if (error || !ticket) {
      return { success: false, detail: error?.message ?? 'Insert failed' }
    }

    // Save AI conversation as a comment on the work order
    const conversationNote =
      `[Smart Sumai AI • ${formatTimestamp()} • ${source === 'sms' ? 'SMS' : 'Web Chat'}]\n` +
      `── User ─────────────────────────\n${originalMessage}\n` +
      `── AI Response ──────────────────\n${action.reply}`

    await svc.from('service_request_comments').insert({
      request_id: ticket.id,
      author_id: ownerId,
      content: conversationNote,
    })

    await svc.from('audit_log').insert({
      entity_type: 'service_request',
      entity_id: ticket.id,
      action: 'created',
      changed_by: ownerId,
      after_data: { title: action.title, property_id: property.id, source: `${source}_ai` },
    })

    await sendNewTicketEmail({
      ticketId: ticket.id,
      title: action.title,
      propertyName: property.name,
      category,
      priority: action.priority,
    }).catch(() => {})

    const woNum = ticket.work_order_number ? `WO-${String(ticket.work_order_number).padStart(4, '0')}` : ''
    return {
      success: true,
      workOrderId: ticket.id,
      detail: `${woNum} ${action.title} — ${property.name}`.trim(),
    }
  }

  if (action.type === 'create_stay') {
    const { data: properties } = await svc
      .from('properties')
      .select('id, name')
      .eq('owner_id', ownerId)
      .ilike('name', `%${action.property_name}%`)
      .limit(1)

    if (!properties?.length) {
      return { success: false, detail: `Property not found: ${action.property_name}` }
    }
    const property = properties[0]

    const { data: stay, error } = await svc
      .from('stays')
      .insert({
        property_id: property.id,
        guest_name: action.guest_name,
        start_date: action.start_date,
        end_date: action.end_date,
        created_by: ownerId,
      })
      .select('id, guest_link_token')
      .single()

    if (error || !stay) {
      return { success: false, detail: error?.message ?? 'Insert failed' }
    }

    const guestLink = `${appUrl}/guest/${stay.guest_link_token}`
    return { success: true, detail: `${action.guest_name} at ${property.name} (${action.start_date}→${action.end_date})\nGuest link: ${guestLink}` }
  }

  if (action.type === 'update_status') {
    const { data: properties } = await svc
      .from('properties')
      .select('id, name')
      .eq('owner_id', ownerId)
      .ilike('name', `%${action.property_name}%`)
      .limit(1)

    if (!properties?.length) {
      return { success: false, detail: `Property not found: ${action.property_name}` }
    }
    const property = properties[0]

    const { error } = await svc
      .from('property_status')
      .upsert({ property_id: property.id, status: action.status, updated_at: new Date().toISOString() }, { onConflict: 'property_id' })

    if (error) return { success: false, detail: error.message }
    return { success: true, detail: `${property.name} → ${action.status.replace(/_/g, ' ')}` }
  }

  if (action.type === 'create_contact') {
    const { data: properties } = await svc
      .from('properties')
      .select('id, name')
      .eq('owner_id', ownerId)
      .ilike('name', `%${action.property_name}%`)
      .limit(1)

    if (!properties?.length) {
      return { success: false, detail: `Property not found: ${action.property_name}` }
    }
    const property = properties[0]

    const { error } = await svc
      .from('property_contacts')
      .insert({
        property_id: property.id,
        name: action.name,
        role: action.role,
        phone: action.phone ?? null,
        email: action.email ?? null,
        notes: action.notes ?? null,
        is_primary: false,
      })

    if (error) return { success: false, detail: error.message }
    return { success: true, detail: `${action.name} (${action.role}) added to ${property.name}` }
  }

  return { success: true }
}
