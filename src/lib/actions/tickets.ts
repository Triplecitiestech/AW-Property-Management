'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendNewTicketEmail, sendTicketStatusChangedEmail, sendAssigneeEmail, sendContactTicketEmail } from '@/lib/email/resend'
import { buildOutboundMessage } from '@/lib/work-order-message'
import type { TicketCategory, TicketPriority, TicketStatus } from '@/lib/supabase/types'

// ---- AI: pick the best contact for a ticket ----

async function aiPickContact(
  contacts: Array<{ id: string; name: string; role: string; email: string | null; phone: string | null }>,
  title: string,
  description: string | null,
  category: string
): Promise<string | null> {
  if (!contacts.length) return null
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey })
    const contactList = contacts.map((c, i) => `${i + 1}. ${c.name} (role: ${c.role})`).join('\n')
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: `Given this service request, pick the best contact number (just the number, nothing else):

Ticket: ${title}
Category: ${category}
${description ? `Details: ${description}` : ''}

Contacts:
${contactList}

Reply with only the contact number (e.g. "2"). If none match, reply "0".`,
      }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '0'
    const idx = parseInt(text, 10) - 1
    if (idx >= 0 && idx < contacts.length) return contacts[idx].id
  } catch { /* silent */ }
  return null
}

// ---- Create Ticket ----

export async function createTicket(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const property_id = formData.get('property_id') as string
  const unit_id = (formData.get('unit_id') as string) || null
  const stay_id = (formData.get('stay_id') as string) || null
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const category = (formData.get('category') as TicketCategory) || 'other'
  const priority = (formData.get('priority') as TicketPriority) || 'medium'
  const due_date = (formData.get('due_date') as string) || null
  const assignee_id = (formData.get('assignee_id') as string) || null
  let assigned_contact_id = (formData.get('assigned_contact_id') as string) || null

  if (!property_id || !title?.trim()) {
    return { error: 'Property and title are required.' }
  }

  // If no contact manually selected, use AI to auto-pick from property contacts
  if (!assigned_contact_id) {
    const { data: contacts } = await supabase
      .from('property_contacts')
      .select('id, name, role, email, phone')
      .eq('property_id', property_id)
    if (contacts && contacts.length > 0) {
      assigned_contact_id = await aiPickContact(contacts, title, description, category)
    }
  }

  const { data: ticket, error } = await supabase
    .from('service_requests')
    .insert({
      property_id,
      unit_id: unit_id || null,
      stay_id: stay_id || null,
      title: title.trim(),
      description: description?.trim() || null,
      category,
      priority,
      due_date: due_date || null,
      assignee_id: assignee_id || null,
      assigned_contact_id: assigned_contact_id || null,
      status: 'open',
      created_by: user.id,
    })
    .select('*, properties(name)')
    .single()

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'service_request',
    entity_id: ticket.id,
    action: 'created',
    changed_by: user.id,
    after_data: { title, property_id, category, priority, status: 'open', assigned_contact_id },
  })

  // Send email notification to owner/managers
  const propertyName = (ticket.properties as { name: string } | null)?.name ?? 'Unknown Property'
  await sendNewTicketEmail({
    ticketId: ticket.id,
    title: ticket.title,
    propertyName,
    category,
    priority,
    description: description ?? undefined,
  }).catch(console.error)

  // Notify internal assignee
  if (assignee_id) {
    const { data: assigneeProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', assignee_id)
      .single()
    if (assigneeProfile?.email) {
      await sendAssigneeEmail({
        to: assigneeProfile.email,
        assigneeName: assigneeProfile.full_name,
        ticketId: ticket.id,
        title: ticket.title,
        propertyName,
        category,
        priority,
        description: description ?? undefined,
        dueDate: due_date ?? undefined,
      }).catch(console.error)
    }
  }

  // Notify external contact (AI-assigned or manual)
  if (assigned_contact_id) {
    const { data: contact } = await supabase
      .from('property_contacts')
      .select('name, email, phone')
      .eq('id', assigned_contact_id)
      .single()
    if (contact?.email) {
      await sendContactTicketEmail({
        to: contact.email,
        contactName: contact.name,
        ticketId: ticket.id,
        title: ticket.title,
        propertyName,
        category,
        priority,
        description: description ?? undefined,
      }).catch(console.error)
    }
  }

  revalidatePath('/work-orders')
  revalidatePath('/dashboard')
  redirect(`/work-orders/${ticket.id}`)
}

// ---- Update Ticket Status ----

export async function updateTicketStatus(id: string, newStatus: TicketStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: before } = await supabase
    .from('service_requests')
    .select('*, properties(name)')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('service_requests')
    .update({ status: newStatus })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'service_request',
    entity_id: id,
    action: 'updated',
    changed_by: user.id,
    before_data: { status: before?.status },
    after_data: { status: newStatus },
  })

  const propertyName = (before?.properties as { name: string } | null)?.name ?? 'Unknown Property'
  await sendTicketStatusChangedEmail({
    ticketId: id,
    title: before?.title ?? 'Ticket',
    propertyName,
    oldStatus: before?.status ?? 'unknown',
    newStatus,
  }).catch(console.error)

  revalidatePath(`/work-orders/${id}`)
  revalidatePath('/work-orders')
  revalidatePath('/dashboard')
  return { success: true }
}

// ---- Update Ticket (general) ----

export async function updateTicket(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const category = formData.get('category') as TicketCategory
  const priority = formData.get('priority') as TicketPriority
  const due_date = (formData.get('due_date') as string) || null
  const assignee_id = (formData.get('assignee_id') as string) || null
  const assigned_contact_id = (formData.get('assigned_contact_id') as string) || null

  const { data: before } = await supabase.from('service_requests').select('*').eq('id', id).single()

  const { error } = await supabase
    .from('service_requests')
    .update({
      title: title.trim(),
      description: description?.trim() || null,
      category,
      priority,
      due_date: due_date || null,
      assignee_id: assignee_id || null,
      assigned_contact_id: assigned_contact_id || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'service_request',
    entity_id: id,
    action: 'updated',
    changed_by: user.id,
    before_data: before,
    after_data: { title, description, category, priority, due_date, assignee_id, assigned_contact_id },
  })

  // Notify new contact if changed
  if (assigned_contact_id && assigned_contact_id !== before?.assigned_contact_id) {
    const { data: contact } = await supabase
      .from('property_contacts')
      .select('name, email')
      .eq('id', assigned_contact_id)
      .single()
    const { data: propertyData } = await supabase
      .from('properties')
      .select('name')
      .eq('id', before?.property_id)
      .single()
    if (contact?.email) {
      await sendContactTicketEmail({
        to: contact.email,
        contactName: contact.name,
        ticketId: id,
        title: title.trim(),
        propertyName: propertyData?.name ?? 'Unknown Property',
        category,
        priority,
        description: description ?? undefined,
      }).catch(console.error)
    }
  }

  // Notify new assignee if changed
  if (assignee_id && assignee_id !== before?.assignee_id) {
    const { data: assigneeProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', assignee_id)
      .single()
    const { data: propertyData } = await supabase
      .from('properties')
      .select('name')
      .eq('id', before?.property_id)
      .single()
    if (assigneeProfile?.email) {
      await sendAssigneeEmail({
        to: assigneeProfile.email,
        assigneeName: assigneeProfile.full_name,
        ticketId: id,
        title: title.trim(),
        propertyName: propertyData?.name ?? 'Unknown Property',
        category,
        priority,
        dueDate: due_date ?? undefined,
      }).catch(console.error)
    }
  }

  revalidatePath(`/work-orders/${id}`)
  revalidatePath('/work-orders')
  return { success: true }
}

// ---- Add Comment ----

export async function addTicketComment(requestId: string, content: string, isInternal = true) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  if (!content?.trim()) return { error: 'Comment cannot be empty.' }

  const { data: comment, error } = await supabase
    .from('service_request_comments')
    .insert({ request_id: requestId, author_id: user.id, content: content.trim(), is_internal: isInternal })
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'service_request_comment',
    entity_id: comment.id,
    action: 'created',
    changed_by: user.id,
    after_data: { request_id: requestId, content: content.trim(), is_internal: isInternal },
  })

  // For external comments, email the assigned contact
  if (!isInternal) {
    const { data: workOrder } = await supabase
      .from('service_requests')
      .select('title, properties(name), assigned_contact:property_contacts!service_requests_assigned_contact_id_fkey(name, email)')
      .eq('id', requestId)
      .single()

    const contact = workOrder?.assigned_contact as unknown as { name: string; email: string | null } | null
    const propertyName = (workOrder?.properties as unknown as { name: string } | null)?.name ?? 'Property'

    if (contact?.email && workOrder) {
      try {
        await sendContactTicketEmail({
          to: contact.email,
          contactName: contact.name,
          ticketId: requestId,
          title: workOrder.title,
          propertyName,
          category: 'update',
          priority: 'medium',
          description: content.trim(),
        })
      } catch { /* non-fatal */ }
    }
  }

  revalidatePath(`/work-orders/${requestId}`)
  return { success: true, comment }
}

// ---- Notify Contact ----
// Send (or re-send) the professional outbound message to the assigned contact.
// Works regardless of whether the contact was previously notified.

export async function notifyContact(id: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: workOrder } = await supabase
    .from('service_requests')
    .select(`
      *,
      properties(name),
      assigned_contact:property_contacts!service_requests_assigned_contact_id_fkey(id, name, email, phone, role)
    `)
    .eq('id', id)
    .single()

  if (!workOrder) return { error: 'Work order not found.' }

  type ContactRow = { id: string; name: string; email: string | null; phone: string | null; role: string }
  const contact = workOrder.assigned_contact as ContactRow | null
  if (!contact) return { error: 'No contact is assigned to this work order.' }
  if (!contact.email) return { error: `${contact.name} has no email address on file. Add an email to their contact to send notifications.` }

  const propertyName = (workOrder.properties as { name: string } | null)?.name ?? 'Property'

  // Get owner profile for message attribution
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('full_name, email, phone_number')
    .eq('id', user.id)
    .single()

  // Fetch checklist items for cleaning work orders
  let checklistItems: string[] | undefined
  if (workOrder.category === 'cleaning') {
    const { data: checklist } = await supabase
      .from('property_checklist_items')
      .select('label')
      .eq('property_id', workOrder.property_id)
      .order('sort_order')
    if (checklist && checklist.length > 0) {
      checklistItems = checklist.map((c: { label: string }) => c.label)
    }
  }

  const message = buildOutboundMessage({
    category: workOrder.category,
    title: workOrder.title,
    priority: workOrder.priority,
    propertyName,
    ownerName: ownerProfile?.full_name ?? 'Property Owner',
    ownerEmail: ownerProfile?.email ?? null,
    ownerPhone: ownerProfile?.phone_number ?? null,
    checklistItems,
  })

  await sendContactTicketEmail({
    to: contact.email,
    contactName: contact.name,
    ticketId: id,
    title: workOrder.title,
    propertyName,
    category: workOrder.category,
    priority: workOrder.priority,
    description: message,
  })

  // Record that we sent the notification
  await supabase
    .from('service_requests')
    .update({
      outbound_message: message,
      outbound_sent_to: `${contact.name} <${contact.email}>`,
      outbound_method: 'email',
      outbound_sent_at: new Date().toISOString(),
    })
    .eq('id', id)

  revalidatePath(`/work-orders/${id}`)
  return { success: true }
}

// ---- Revert AI Action ----
// Undoes a single AI-performed action recorded in audit_log.

export async function revertAiAction(auditId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: entry } = await supabase
    .from('audit_log')
    .select('*')
    .eq('id', auditId)
    .single()

  if (!entry) return { error: 'Audit entry not found.' }
  if (entry.reverted_at) return { error: 'This action has already been reverted.' }
  if (!entry.is_ai_action) return { error: 'This action was not performed by the AI.' }

  const beforeData = entry.before_data as Record<string, unknown> | null
  const afterData = entry.after_data as Record<string, unknown> | null
  const aiAction = afterData?.ai_action as string | undefined

  if (entry.entity_type === 'service_request') {
    if (entry.action === 'created' || aiAction === 'create_work_order') {
      // Revert a creation: close the work order + add note
      await supabase.from('service_requests').update({ status: 'closed' }).eq('id', entry.entity_id)
      await supabase.from('service_request_comments').insert({
        request_id: entry.entity_id,
        author_id: user.id,
        content: `[AI Action Reverted] This work order was created by the AI and has been closed.`,
        is_internal: true,
      }).then(undefined, () => {})
    } else if (entry.action === 'updated' && beforeData) {
      const restore: Record<string, unknown> = {}
      if (beforeData.status !== undefined) restore.status = beforeData.status
      if (beforeData.priority !== undefined) restore.priority = beforeData.priority
      if (Object.keys(restore).length) {
        await supabase.from('service_requests').update(restore).eq('id', entry.entity_id)
      }
    }
  }

  await supabase
    .from('audit_log')
    .update({ reverted_at: new Date().toISOString(), reverted_by: user.id })
    .eq('id', auditId)

  revalidatePath(`/work-orders/${entry.entity_id}`)
  revalidatePath('/work-orders')
  return { success: true }
}

// ---- Delete Ticket ----

export async function deleteTicket(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: before } = await supabase.from('service_requests').select('*').eq('id', id).single()

  const { error } = await supabase.from('service_requests').delete().eq('id', id)
  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'service_request',
    entity_id: id,
    action: 'deleted',
    changed_by: user.id,
    before_data: before,
  })

  revalidatePath('/work-orders')
  revalidatePath('/dashboard')
  redirect('/work-orders')
}
