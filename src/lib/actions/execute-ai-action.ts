/**
 * Shared AI action executor used by both the web chat route and the SMS webhook.
 * Handles create_work_order, create_stay, update_status, create_contact.
 * Returns a human-readable result string.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { AiSmsAction } from '@/lib/sms/ai-handler'
import { sendNewTicketEmail, sendContactTicketEmail } from '@/lib/email/resend'
import { buildOutboundMessage } from '@/lib/work-order-message'

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

/** Map work order category to a property status that should be automatically set */
function categoryToPropertyStatus(cat: string): string | null {
  if (cat === 'cleaning') return 'needs_cleaning'
  if (['maintenance', 'plumbing', 'electrical', 'hvac', 'landscaping'].includes(cat)) return 'needs_maintenance'
  return null
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

    // Get owner profile for outbound message attribution
    const { data: ownerProfile } = await svc
      .from('profiles')
      .select('full_name, email, phone_number')
      .eq('id', ownerId)
      .single()

    const ownerName = ownerProfile?.full_name ?? 'Property Owner'
    const ownerEmail = ownerProfile?.email ?? null
    const ownerPhone = ownerProfile?.phone_number ?? null

    // Find primary contact for this property and category
    const { data: contacts } = await svc
      .from('property_contacts')
      .select('id, name, email, phone, role')
      .eq('property_id', property.id)
      .or(`role.eq.${category},role.eq.maintenance,role.eq.primary`)
      .order('is_primary', { ascending: false })
      .limit(5)

    type ContactRow = { id: string; name: string; email: string | null; phone: string | null; role: string }
    // Pick the best matching contact: category-specific > primary
    const assignedContact: ContactRow | null = (contacts as ContactRow[] | null)?.find((c: ContactRow) => c.role === category)
      ?? (contacts as ContactRow[] | null)?.find((c: ContactRow) => c.role === 'primary')
      ?? (contacts as ContactRow[] | null)?.[0]
      ?? null

    // For cleaning orders, fetch the real property checklist items
    let checklistItems: string[] | undefined
    if (category === 'cleaning') {
      const { data: checklist } = await svc
        .from('property_checklist_items')
        .select('label')
        .eq('property_id', property.id)
        .order('sort_order')
      if (checklist && checklist.length > 0) {
        checklistItems = checklist.map((c: { label: string }) => c.label)
      }
    }

    // Build outbound message with real checklist if available
    const outboundMessage = buildOutboundMessage({
      category,
      title: action.title,
      priority: action.priority,
      propertyName: property.name,
      ownerName,
      ownerEmail,
      ownerPhone,
      checklistItems,
    })

    const outboundSentAt = new Date()

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
        assigned_contact_id: assignedContact?.id ?? null,
        description: `Created by Smart Sumi AI via ${source === 'sms' ? 'SMS' : 'web chat'}.\n\nOriginal request: "${originalMessage}"`,
        outbound_message: outboundMessage,
        outbound_sent_to: assignedContact
          ? `${assignedContact.name}${assignedContact.email ? ` <${assignedContact.email}>` : ''}${assignedContact.phone ? ` / ${assignedContact.phone}` : ''}`
          : null,
        outbound_method: assignedContact?.email ? 'email' : assignedContact?.phone ? 'sms' : 'none',
        outbound_sent_at: outboundSentAt.toISOString(),
      })
      .select('id, work_order_number')
      .single()

    if (error || !ticket) {
      return { success: false, detail: error?.message ?? 'Insert failed' }
    }

    // Auto-update property status based on work order category
    const newStatus = categoryToPropertyStatus(category)
    if (newStatus) {
      await svc
        .from('property_status')
        .upsert(
          { property_id: property.id, status: newStatus, updated_at: new Date().toISOString() },
          { onConflict: 'property_id' }
        )
        .then(undefined, () => {})
    }

    // Save AI conversation as an internal comment on the work order
    const conversationNote =
      `[Smart Sumi AI • ${formatTimestamp()} • ${source === 'sms' ? 'SMS' : 'Web Chat'}]\n` +
      `── User ─────────────────────────\n${originalMessage}\n` +
      `── AI Response ──────────────────\n${action.reply}`

    await svc.from('service_request_comments').insert({
      request_id: ticket.id,
      author_id: ownerId,
      content: conversationNote,
    }).then(undefined, () => {})

    await svc.from('audit_log').insert({
      entity_type: 'service_request',
      entity_id: ticket.id,
      action: 'created',
      changed_by: ownerId,
      after_data: { title: action.title, property_id: property.id, source: `${source}_ai`, ai_action: 'create_work_order' },
      is_ai_action: true,
    }).then(undefined, () => {})

    // Send internal notification email
    await sendNewTicketEmail({
      ticketId: ticket.id,
      title: action.title,
      propertyName: property.name,
      category,
      priority: action.priority,
    }).catch(() => {})

    // Send external email to assigned contact if they have an email
    if (assignedContact?.email) {
      await sendContactTicketEmail({
        to: assignedContact.email,
        contactName: assignedContact.name,
        ticketId: ticket.id,
        title: action.title,
        propertyName: property.name,
        category,
        priority: action.priority,
        description: outboundMessage,
      }).catch(() => {})
    }

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

  if (action.type === 'close_work_order') {
    let closePropertyId: string | null = null
    if (action.property_name) {
      const { data: closeProps } = await svc
        .from('properties')
        .select('id')
        .eq('owner_id', ownerId)
        .ilike('name', `%${action.property_name}%`)
        .limit(1)
      closePropertyId = closeProps?.[0]?.id ?? null
    }

    let closeQuery = svc
      .from('service_requests')
      .select('id, title, status')
      .eq('created_by', ownerId)
      .neq('status', 'closed')
      .ilike('title', `%${action.work_order_title}%`)
      .order('created_at', { ascending: false })
      .limit(1)
    if (closePropertyId) closeQuery = closeQuery.eq('property_id', closePropertyId)

    const { data: tickets } = await closeQuery
    if (!tickets?.length) return { success: false, detail: `No open work order found matching: "${action.work_order_title}"` }
    const ticket = tickets[0]

    await svc.from('service_requests').update({ status: 'closed' }).eq('id', ticket.id)
    await svc.from('audit_log').insert({
      entity_type: 'service_request',
      entity_id: ticket.id,
      action: 'updated',
      changed_by: ownerId,
      before_data: { status: ticket.status },
      after_data: { status: 'closed', source: `${source}_ai`, ai_action: 'close_work_order' },
      is_ai_action: true,
    }).then(undefined, () => {})

    return { success: true, detail: `Closed: ${ticket.title}` }
  }

  if (action.type === 'update_work_order') {
    // Build property filter if specified for disambiguation
    let propertyId: string | null = null
    if (action.property_name) {
      const { data: props } = await svc
        .from('properties')
        .select('id')
        .eq('owner_id', ownerId)
        .ilike('name', `%${action.property_name}%`)
        .limit(1)
      propertyId = props?.[0]?.id ?? null
    }

    let ticketQuery = svc
      .from('service_requests')
      .select('id, title, status, priority, due_date')
      .eq('created_by', ownerId)
      .ilike('title', `%${action.work_order_title}%`)
      .order('created_at', { ascending: false })
      .limit(1)
    if (propertyId) ticketQuery = ticketQuery.eq('property_id', propertyId)

    const { data: tickets } = await ticketQuery
    if (!tickets?.length) return { success: false, detail: `No work order found matching: "${action.work_order_title}"` }
    const ticket = tickets[0]

    const updates: Record<string, string> = {}
    if (action.new_status) updates.status = action.new_status
    if (action.new_priority) updates.priority = action.new_priority
    if (action.due_date) updates.due_date = action.due_date
    if (!Object.keys(updates).length) return { success: false, detail: 'No changes specified.' }

    await svc.from('service_requests').update(updates).eq('id', ticket.id)
    await svc.from('audit_log').insert({
      entity_type: 'service_request',
      entity_id: ticket.id,
      action: 'updated',
      changed_by: ownerId,
      before_data: { status: ticket.status, priority: ticket.priority, due_date: ticket.due_date },
      after_data: { ...updates, source: `${source}_ai`, ai_action: 'update_work_order' },
      is_ai_action: true,
    }).then(undefined, () => {})

    const changes = [
      action.new_status && `status → ${action.new_status}`,
      action.new_priority && `priority → ${action.new_priority}`,
      action.due_date && `due → ${action.due_date}`,
    ].filter(Boolean).join(', ')
    return { success: true, detail: `${ticket.title}: ${changes}` }
  }

  if (action.type === 'repair_work_order') {
    // Step 1: Find and close the incorrect work order
    let wrongPropertyId: string | null = null
    if (action.wrong_property_name) {
      const { data: wrongProps } = await svc
        .from('properties')
        .select('id')
        .eq('owner_id', ownerId)
        .ilike('name', `%${action.wrong_property_name}%`)
        .limit(1)
      wrongPropertyId = wrongProps?.[0]?.id ?? null
    }

    let wrongQuery = svc
      .from('service_requests')
      .select('id, title, status')
      .eq('created_by', ownerId)
      .neq('status', 'closed')
      .ilike('title', `%${action.wrong_work_order_title}%`)
      .order('created_at', { ascending: false })
      .limit(3)
    if (wrongPropertyId) wrongQuery = wrongQuery.eq('property_id', wrongPropertyId)

    const { data: wrongWOs } = await wrongQuery
    let removedTitle = ''
    let removedCount = 0

    for (const wo of wrongWOs ?? []) {
      await svc.from('service_requests').update({ status: 'closed' }).eq('id', wo.id)
      await svc.from('audit_log').insert({
        entity_type: 'service_request',
        entity_id: wo.id,
        action: 'updated',
        changed_by: ownerId,
        before_data: { status: wo.status },
        after_data: { status: 'closed', source: `${source}_ai`, ai_action: 'repair_work_order_remove' },
        is_ai_action: true,
      }).then(undefined, () => {})
      removedTitle = wo.title
      removedCount++
    }

    // Step 2: Create the correct work order on the correct property
    const createAction: AiSmsAction = {
      type: 'create_work_order',
      reply: '',
      property_name: action.correct_property_name,
      title: action.correct_title,
      priority: action.correct_priority,
      category: action.correct_category,
    }
    const createResult = await executeAiAction(createAction, ownerId, source, originalMessage, appUrl)

    if (!createResult.success) {
      const removedMsg = removedCount > 0 ? `Removed "${removedTitle}". ` : ''
      return { success: false, detail: `${removedMsg}But failed to create correct WO: ${createResult.detail}` }
    }

    const removedMsg = removedCount > 0 ? `Removed: "${removedTitle}" | ` : ''
    return {
      success: true,
      workOrderId: createResult.workOrderId,
      detail: `${removedMsg}Created: ${createResult.detail}`,
    }
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
