'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendGuestLinkEmail } from '@/lib/email/resend'

// ---- Create Stay ----

export async function createStay(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const property_id = formData.get('property_id') as string
  const guest_name = formData.get('guest_name') as string
  const guest_email = (formData.get('guest_email') as string) || null
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const notes = (formData.get('notes') as string) || null
  const wifi_name = (formData.get('wifi_name') as string) || null
  const wifi_password = (formData.get('wifi_password') as string) || null
  const door_code = (formData.get('door_code') as string) || null
  const host_instructions = (formData.get('host_instructions') as string) || null

  if (!property_id || !guest_name?.trim() || !start_date || !end_date) {
    return { error: 'Property, guest name, start date, and end date are required.' }
  }

  const { data: stay, error } = await supabase
    .from('stays')
    .insert({
      property_id,
      guest_name: guest_name.trim(),
      guest_email: guest_email?.trim() || null,
      start_date,
      end_date,
      notes: notes?.trim() || null,
      wifi_name: wifi_name?.trim() || null,
      wifi_password: wifi_password?.trim() || null,
      door_code: door_code?.trim() || null,
      host_instructions: host_instructions?.trim() || null,
      created_by: user.id,
    })
    .select('*, properties(name)')
    .single()

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'stay',
    entity_id: stay.id,
    action: 'created',
    changed_by: user.id,
    after_data: { guest_name, property_id, start_date, end_date },
  })

  // Send guest link email if email provided
  if (guest_email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const guestLink = `${appUrl}/guest/${stay.guest_link_token}`
    const propertyName = (stay.properties as { name: string } | null)?.name ?? 'the property'
    await sendGuestLinkEmail({
      to: guest_email,
      guestName: guest_name.trim(),
      propertyName,
      startDate: start_date,
      endDate: end_date,
      guestLink,
    }).catch(console.error)
  }

  revalidatePath('/stays')
  revalidatePath('/dashboard')
  redirect(`/stays/${stay.id}`)
}

// ---- Update Stay ----

export async function updateStay(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const guest_name = formData.get('guest_name') as string
  const guest_email = (formData.get('guest_email') as string) || null
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const notes = (formData.get('notes') as string) || null

  const { data: before } = await supabase.from('stays').select('*').eq('id', id).single()

  const { error } = await supabase
    .from('stays')
    .update({ guest_name: guest_name.trim(), guest_email: guest_email?.trim() || null, start_date, end_date, notes: notes?.trim() || null })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'stay',
    entity_id: id,
    action: 'updated',
    changed_by: user.id,
    before_data: before,
    after_data: { guest_name, guest_email, start_date, end_date, notes },
  })

  revalidatePath(`/stays/${id}`)
  revalidatePath('/stays')
  return { success: true }
}

// ---- Delete Stay ----

export async function deleteStay(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: before } = await supabase.from('stays').select('*').eq('id', id).single()

  const { error } = await supabase.from('stays').delete().eq('id', id)
  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'stay',
    entity_id: id,
    action: 'deleted',
    changed_by: user.id,
    before_data: before,
  })

  revalidatePath('/stays')
  revalidatePath('/dashboard')
  redirect('/stays')
}
