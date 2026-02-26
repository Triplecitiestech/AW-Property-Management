'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { PropertyStatusEnum, OccupancyEnum } from '@/lib/supabase/types'
import { getOrCreateUserOrg } from '@/lib/actions/organizations'
import { DEFAULT_CHECKLIST_LABELS } from '@/lib/checklist-defaults'

// ---- Create Property (wizard flow — returns id, does not redirect) ----

export async function createPropertyForWizard(
  name: string,
  address: string,
  description: string | null
): Promise<{ propertyId: string } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    if (!name?.trim()) return { error: 'Property name is required.' }

    const orgId = await getOrCreateUserOrg()

    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        name: name.trim(),
        address: address?.trim() ?? '',
        description: description?.trim() || null,
        owner_id: user.id,
        org_id: orgId,
      })
      .select('id')
      .single()

    if (error) return { error: error.message }

    await supabase.from('audit_log').insert({
      entity_type: 'property',
      entity_id: property.id,
      action: 'created',
      changed_by: user.id,
      after_data: { name, address, description },
    })

    // Seed default checklist items for new property
    const defaultItems = DEFAULT_CHECKLIST_LABELS.map((label, i) => ({
      property_id: property.id,
      label,
      sort_order: i,
    }))
    try { await supabase.from('property_checklist_items').insert(defaultItems) } catch { /* non-fatal */ }

    revalidatePath('/properties')
    revalidatePath('/dashboard')
    return { propertyId: property.id }
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || err.message === 'NEXT_NOT_FOUND')) throw err
    return { error: err instanceof Error ? err.message : 'Failed to create property' }
  }
}

// ---- Create Property ----

export async function createProperty(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const description = formData.get('description') as string | null

  if (!name?.trim()) return { error: 'Property name is required.' }

  const orgId = await getOrCreateUserOrg()

  const { data: property, error } = await supabase
    .from('properties')
    .insert({ name: name.trim(), address: address?.trim() ?? '', description: description?.trim() || null, owner_id: user.id, org_id: orgId })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Audit log
  await supabase.from('audit_log').insert({
    entity_type: 'property',
    entity_id: property.id,
    action: 'created',
    changed_by: user.id,
    after_data: { name, address, description },
  })

  revalidatePath('/properties')
  revalidatePath('/dashboard')
  redirect(`/properties/${property.id}`)
}

// ---- Update Property ----

export async function updateProperty(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const description = formData.get('description') as string | null

  // Snapshot before
  const { data: before } = await supabase.from('properties').select('*').eq('id', id).single()

  const { error } = await supabase
    .from('properties')
    .update({ name: name.trim(), address: address?.trim() ?? '', description: description?.trim() || null })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'property',
    entity_id: id,
    action: 'updated',
    changed_by: user.id,
    before_data: before,
    after_data: { name, address, description },
  })

  revalidatePath(`/properties/${id}`)
  revalidatePath('/properties')
  revalidatePath('/dashboard')
  return { success: true }
}

// ---- Delete Property ----

export async function deleteProperty(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: before } = await supabase.from('properties').select('*').eq('id', id).single()

  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'property',
    entity_id: id,
    action: 'deleted',
    changed_by: user.id,
    before_data: before,
  })

  revalidatePath('/properties')
  revalidatePath('/dashboard')
  redirect('/properties')
}

// ---- Update Quick Notes ----

export async function updatePropertyNotes(propertyId: string, quickNotes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase.from('properties')
    .update({ quick_notes: quickNotes.trim() || null })
    .eq('id', propertyId)

  if (error) return { error: error.message }

  revalidatePath(`/properties/${propertyId}`)
  return { success: true }
}

// ---- Update AI Instructions ----

export async function updateAiInstructions(propertyId: string, aiInstructions: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase.from('properties')
    .update({ ai_instructions: aiInstructions.trim() || null })
    .eq('id', propertyId)

  if (error) return { error: error.message }

  revalidatePath(`/properties/${propertyId}`)
  return { success: true }
}

// ---- Update Property Status ----

export async function updatePropertyStatus(
  propertyId: string,
  status: PropertyStatusEnum,
  occupancy: OccupancyEnum,
  notes?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    // Snapshot before
    const { data: before } = await supabase
      .from('property_status')
      .select('*')
      .eq('property_id', propertyId)
      .single()

    const { error } = await supabase
      .from('property_status')
      .upsert(
        { property_id: propertyId, status, occupancy, notes: notes || null, updated_by: user.id, updated_at: new Date().toISOString() },
        { onConflict: 'property_id' }
      )

    if (error) return { error: error.message }

    await supabase.from('audit_log').insert({
      entity_type: 'property_status',
      entity_id: propertyId,
      action: before ? 'updated' : 'created',
      changed_by: user.id,
      before_data: before,
      after_data: { status, occupancy, notes },
    })

    revalidatePath(`/properties/${propertyId}`)
    revalidatePath('/properties')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || err.message === 'NEXT_NOT_FOUND')) throw err
    return { error: err instanceof Error ? err.message : 'Failed to update status' }
  }
}
