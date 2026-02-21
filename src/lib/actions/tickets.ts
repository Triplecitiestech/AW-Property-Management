'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendNewTicketEmail, sendTicketStatusChangedEmail, sendAssigneeEmail } from '@/lib/email/resend'
import type { TicketCategory, TicketPriority, TicketStatus } from '@/lib/supabase/types'

// ---- Create Ticket ----

export async function createTicket(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const property_id = formData.get('property_id') as string
  const stay_id = (formData.get('stay_id') as string) || null
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const category = (formData.get('category') as TicketCategory) || 'other'
  const priority = (formData.get('priority') as TicketPriority) || 'medium'
  const due_date = (formData.get('due_date') as string) || null
  const assignee_id = (formData.get('assignee_id') as string) || null

  if (!property_id || !title?.trim()) {
    return { error: 'Property and title are required.' }
  }

  const { data: ticket, error } = await supabase
    .from('service_requests')
    .insert({
      property_id,
      stay_id: stay_id || null,
      title: title.trim(),
      description: description?.trim() || null,
      category,
      priority,
      due_date: due_date || null,
      assignee_id: assignee_id || null,
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
    after_data: { title, property_id, category, priority, status: 'open' },
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

  // If assigned, also notify the assignee directly
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

  revalidatePath('/tickets')
  revalidatePath('/dashboard')
  redirect(`/tickets/${ticket.id}`)
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

  revalidatePath(`/tickets/${id}`)
  revalidatePath('/tickets')
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
    })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'service_request',
    entity_id: id,
    action: 'updated',
    changed_by: user.id,
    before_data: before,
    after_data: { title, description, category, priority, due_date, assignee_id },
  })

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

  revalidatePath(`/tickets/${id}`)
  revalidatePath('/tickets')
  return { success: true }
}

// ---- Add Comment ----

export async function addTicketComment(requestId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  if (!content?.trim()) return { error: 'Comment cannot be empty.' }

  const { data: comment, error } = await supabase
    .from('service_request_comments')
    .insert({ request_id: requestId, author_id: user.id, content: content.trim() })
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'service_request_comment',
    entity_id: comment.id,
    action: 'created',
    changed_by: user.id,
    after_data: { request_id: requestId, content: content.trim() },
  })

  revalidatePath(`/tickets/${requestId}`)
  return { success: true, comment }
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

  revalidatePath('/tickets')
  revalidatePath('/dashboard')
  redirect('/tickets')
}
