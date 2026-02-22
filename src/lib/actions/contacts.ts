'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const RETHROW = (err: unknown) =>
  err instanceof Error && (err.message === 'NEXT_REDIRECT' || err.message === 'NEXT_NOT_FOUND')

export async function addContact(propertyId: string, formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const name      = (formData.get('name')  as string)?.trim()
    const role      = (formData.get('role')  as string) || 'other'
    const phone     = (formData.get('phone') as string)?.trim() || null
    const email     = (formData.get('email') as string)?.trim() || null
    const notes     = (formData.get('notes') as string)?.trim() || null
    const isPrimary = formData.get('is_primary') === 'true'

    if (!name) return { error: 'Contact name is required.' }

    if (isPrimary) {
      await supabase.from('property_contacts')
        .update({ is_primary: false })
        .eq('property_id', propertyId)
        .eq('is_primary', true)
    }

    const { error } = await supabase.from('property_contacts').insert({
      property_id: propertyId,
      name,
      role,
      phone,
      email,
      notes,
      is_primary: isPrimary,
    })

    if (error) return { error: error.message }

    revalidatePath(`/properties/${propertyId}`)
    return { success: true }
  } catch (err: unknown) {
    if (RETHROW(err)) throw err
    return { error: err instanceof Error ? err.message : 'Failed to add contact' }
  }
}

export async function updateContact(
  contactId: string,
  propertyId: string,
  formData: FormData
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const name      = (formData.get('name')  as string)?.trim()
    const role      = (formData.get('role')  as string) || 'other'
    const phone     = (formData.get('phone') as string)?.trim() || null
    const email     = (formData.get('email') as string)?.trim() || null
    const notes     = (formData.get('notes') as string)?.trim() || null
    const isPrimary = formData.get('is_primary') === 'true'

    if (!name) return { error: 'Contact name is required.' }

    if (isPrimary) {
      await supabase.from('property_contacts')
        .update({ is_primary: false })
        .eq('property_id', propertyId)
        .eq('is_primary', true)
        .neq('id', contactId)
    }

    const { error } = await supabase.from('property_contacts')
      .update({ name, role, phone, email, notes, is_primary: isPrimary })
      .eq('id', contactId)

    if (error) return { error: error.message }

    revalidatePath(`/properties/${propertyId}`)
    return { success: true }
  } catch (err: unknown) {
    if (RETHROW(err)) throw err
    return { error: err instanceof Error ? err.message : 'Failed to update contact' }
  }
}

export async function deleteContact(contactId: string, propertyId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { error } = await supabase.from('property_contacts')
      .delete()
      .eq('id', contactId)

    if (error) return { error: error.message }

    revalidatePath(`/properties/${propertyId}`)
    return { success: true }
  } catch (err: unknown) {
    if (RETHROW(err)) throw err
    return { error: err instanceof Error ? err.message : 'Failed to delete contact' }
  }
}
