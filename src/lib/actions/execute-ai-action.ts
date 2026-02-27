/**
 * Shared AI action executor used by both the web chat route and the SMS webhook.
 * Handles create_work_order, create_stay, update_status, create_contact.
 * Returns a human-readable result string.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { AiSmsAction } from '@/lib/sms/ai-handler'
import { sendNewTicketEmail, sendContactTicketEmail } from '@/lib/email/resend'

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

/**
 * Build a category-specific external-facing message to send to the assigned contact.
 * This message is sent on behalf of the property owner and includes specifics per category.
 * For cleaning, uses real property checklist items if available; falls back to generic list.
 */
function buildOutboundMessage(params: {
  category: string
  title: string
  priority: string
  propertyName: string
  ownerName: string
  ownerEmail: string | null
  ownerPhone: string | null
  source: 'web' | 'sms'
  checklistItems?: string[]
}): string {
  const { category, title, priority, propertyName, ownerName, ownerEmail, ownerPhone, checklistItems } = params

  const replyLine = ownerEmail
    ? `Please reply to this email with confirmation, updates, and payment info.`
    : ownerPhone
    ? `Please reply to ${ownerPhone} with confirmation, updates, and payment info.`
    : `Please reply to confirm receipt and provide updates.`

  const intro = `Hi,\n\nI'm reaching out on behalf of ${ownerName} regarding the following service request at ${propertyName}:\n\n`
  const details = `Work Order: ${title}\nPriority: ${priority.toUpperCase()}\nProperty: ${propertyName}\n\n`

  let specifics = ''
  const cat = category.toLowerCase()

  if (cat === 'cleaning') {
    // Use real property checklist if available; otherwise use generic fallback
    const items: string[] = checklistItems && checklistItems.length > 0
      ? checklistItems
      : [
          'Vacuum/sweep all floors',
          'Mop hard surface floors',
          'Clean and sanitize all bathrooms',
          'Clean kitchen (counters, appliances, sink)',
          'Change all bed linens and towels',
          'Empty trash in all rooms',
          'Dust surfaces and ceiling fans',
          'Wipe down windows and mirrors',
          'Restock any supplies (soap, toilet paper, etc.)',
          'Lock up securely when finished',
        ]
    specifics = `Cleaning Checklist:\n${items.map(i => `□ ${i}`).join('\n')}\n\n`
  } else if (cat === 'plumbing') {
    specifics = `Issue Details:\n` +
      `${title}\n\n` +
      `Please assess the situation and provide:\n` +
      `• Description of the problem and root cause\n` +
      `• Parts needed (if any) and estimated cost\n` +
      `• Estimated time to complete\n` +
      `• Your earliest available appointment\n\n`
  } else if (cat === 'electrical') {
    specifics = `Issue Details:\n` +
      `${title}\n\n` +
      `Please assess and provide:\n` +
      `• Safety assessment of the issue\n` +
      `• Required parts and estimated cost\n` +
      `• Estimated time to complete\n` +
      `• Your earliest available appointment\n\n` +
      `Note: Ensure all work meets local electrical code requirements.\n\n`
  } else if (cat === 'hvac') {
    specifics = `Issue Details:\n` +
      `${title}\n\n` +
      `Please assess and provide:\n` +
      `• Diagnosis of the HVAC issue\n` +
      `• Required parts/refrigerant (if applicable) and cost\n` +
      `• Estimated repair time\n` +
      `• Your earliest available appointment\n\n`
  } else if (cat === 'landscaping') {
    specifics = `Landscaping Request:\n` +
      `${title}\n\n` +
      `Please include in your response:\n` +
      `• Scope of work and estimated time\n` +
      `• Any equipment or materials needed\n` +
      `• Your available dates\n` +
      `• Cost estimate\n\n`
  } else if (cat === 'maintenance') {
    specifics = `Maintenance Details:\n` +
      `${title}\n\n` +
      `Please provide:\n` +
      `• Your assessment and recommended fix\n` +
      `• Materials/parts needed and cost estimate\n` +
      `• Estimated time to complete\n` +
      `• Your earliest availability\n\n`
  } else if (cat === 'supplies') {
    specifics = `Supplies Needed:\n` +
      `${title}\n\n` +
      `Please confirm:\n` +
      `• Availability of requested items\n` +
      `• Total cost and delivery timeline\n\n`
  } else {
    specifics = `Details:\n${title}\n\n`
  }

  const closing = `${replyLine}\n\nThank you,\n${ownerName}\n(via Smart Sumai AI Property Manager)`

  return intro + details + specifics + closing
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
      source,
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
        description: `Created by Smart Sumai AI via ${source === 'sms' ? 'SMS' : 'web chat'}.\n\nOriginal request: "${originalMessage}"`,
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
      `[Smart Sumai AI • ${formatTimestamp()} • ${source === 'sms' ? 'SMS' : 'Web Chat'}]\n` +
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
      after_data: { title: action.title, property_id: property.id, source: `${source}_ai` },
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
