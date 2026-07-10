'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const RETHROW = (err: unknown) =>
  err instanceof Error && (err.message === 'NEXT_REDIRECT' || err.message === 'NEXT_NOT_FOUND')

// ---- Add a contact to a single property (used from property detail page) ----

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

    const { data: contact, error } = await supabase.from('property_contacts').insert({
      property_id: propertyId,
      name,
      role,
      phone,
      email,
      notes,
      is_primary: isPrimary,
    }).select('id').single()

    if (error || !contact) return { error: error?.message ?? 'Failed to create contact' }

    // Keep junction table in sync
    await supabase.from('contact_property_links').upsert({
      contact_id: contact.id,
      property_id: propertyId,
      role,
      is_primary: isPrimary,
    }, { onConflict: 'contact_id,property_id' })

    revalidatePath(`/properties/${propertyId}`)
    revalidatePath('/contacts')
    return { success: true }
  } catch (err: unknown) {
    if (RETHROW(err)) throw err
    return { error: err instanceof Error ? err.message : 'Failed to add contact' }
  }
}

// ---- Create a contact for multiple properties (global contacts page) ----
// Each property-role pair creates its own property_contacts row.

export async function createContactForProperties(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const name  = (formData.get('name')  as string)?.trim()
    const phone = (formData.get('phone') as string)?.trim() || null
    const email = (formData.get('email') as string)?.trim() || null
    const notes = (formData.get('notes') as string)?.trim() || null

    if (!name) return { error: 'Contact name is required.' }

    // Parse property-role assignments (repeating form fields)
    const propertyIds = formData.getAll('property_id') as string[]
    const roles       = formData.getAll('property_role') as string[]
    const primaries   = formData.getAll('property_primary') as string[]

    const assignments = propertyIds
      .map((pid, i) => ({ propertyId: pid, role: roles[i] || 'other', isPrimary: primaries[i] === 'true' }))
      .filter(a => a.propertyId)

    if (assignments.length === 0) return { error: 'Select at least one property.' }

    for (const assignment of assignments) {
      if (assignment.isPrimary) {
        await supabase.from('property_contacts')
          .update({ is_primary: false })
          .eq('property_id', assignment.propertyId)
          .eq('is_primary', true)
      }

      const { data: contact, error } = await supabase.from('property_contacts').insert({
        property_id: assignment.propertyId,
        name,
        phone,
        email,
        notes,
        role: assignment.role,
        is_primary: assignment.isPrimary,
      }).select('id').single()

      if (error || !contact) return { error: error?.message ?? 'Failed to create contact' }

      await supabase.from('contact_property_links').upsert({
        contact_id: contact.id,
        property_id: assignment.propertyId,
        role: assignment.role,
        is_primary: assignment.isPrimary,
      }, { onConflict: 'contact_id,property_id' })

      revalidatePath(`/properties/${assignment.propertyId}`)
    }

    revalidatePath('/contacts')
    redirect('/contacts')
  } catch (err: unknown) {
    if (RETHROW(err)) throw err
    return { error: err instanceof Error ? err.message : 'Failed to create contact' }
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
