'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CHECKLIST_LABELS, DEFAULT_CATEGORY_CHECKLISTS } from '@/lib/checklist-defaults'

// ---- Get checklist items for a property ----
// Returns custom items if configured, else the app-level defaults

export async function getChecklistItems(propertyId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('property_checklist_items')
    .select('label')
    .eq('property_id', propertyId)
    .order('sort_order')

  if (data && data.length > 0) {
    return data.map(item => item.label)
  }
  return DEFAULT_CHECKLIST_LABELS
}

// ---- Save checklist items (replaces all existing items for property) ----

export async function saveChecklistItems(propertyId: string, labels: string[]) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    // Delete existing
    const { error: deleteError } = await supabase
      .from('property_checklist_items')
      .delete()
      .eq('property_id', propertyId)

    if (deleteError) return { error: deleteError.message }

    // Insert new items
    if (labels.length > 0) {
      const items = labels
        .map((label, index) => ({ property_id: propertyId, label: label.trim(), sort_order: index }))
        .filter(item => item.label.length > 0)

      const { error: insertError } = await supabase
        .from('property_checklist_items')
        .insert(items)

      if (insertError) return { error: insertError.message }
    }

    revalidatePath(`/properties/${propertyId}`)
    return { success: true }
  } catch (err: unknown) {
    // Let Next.js handle redirect/notFound — rethrow those
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || err.message === 'NEXT_NOT_FOUND')) throw err
    return { error: err instanceof Error ? err.message : 'Failed to save checklist' }
  }
}

// ---- Toggle a single checklist item's checked state ----

export async function toggleChecklistItem(itemId: string, checked: boolean) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    const { error } = await supabase.from('property_checklist_items').update({ is_checked: checked }).eq('id', itemId)
    if (error) return { error: error.message }
    return { success: true }
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || err.message === 'NEXT_NOT_FOUND')) throw err
    return { error: err instanceof Error ? err.message : 'Failed to toggle item' }
  }
}

// ---- Reset all checked states for a property ----

export async function resetChecklistChecks(propertyId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    const { error } = await supabase.from('property_checklist_items').update({ is_checked: false }).eq('property_id', propertyId)
    if (error) return { error: error.message }
    revalidatePath(`/properties/${propertyId}`)
    return { success: true }
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || err.message === 'NEXT_NOT_FOUND')) throw err
    return { error: err instanceof Error ? err.message : 'Failed to reset' }
  }
}

// ---- Seed default checklist items if property has none ----

export async function seedDefaultChecklistIfEmpty(propertyId: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('property_checklist_items')
    .select('id')
    .eq('property_id', propertyId)
    .limit(1)

  if (existing && existing.length > 0) return { seeded: false }

  const items = DEFAULT_CHECKLIST_LABELS.map((label, i) => ({
    property_id: propertyId,
    label,
    sort_order: i,
  }))

  const { error } = await supabase.from('property_checklist_items').insert(items)
  if (error) return { seeded: false, error: error.message }
  return { seeded: true }
}

// ---- Reset to defaults ----

export async function resetChecklistToDefaults(propertyId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { error } = await supabase
      .from('property_checklist_items')
      .delete()
      .eq('property_id', propertyId)

    if (error) return { error: error.message }

    revalidatePath(`/properties/${propertyId}`)
    return { success: true }
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || err.message === 'NEXT_NOT_FOUND')) throw err
    return { error: err instanceof Error ? err.message : 'Failed to reset checklist' }
  }
}

// ─── Multi-Checklist System ────────────────────────────────────────────────────

export async function createPropertyChecklist(propertyId: string, name: string, category: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data, error } = await supabase
    .from('property_checklists')
    .insert({ property_id: propertyId, name, category })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/properties/${propertyId}`)
  return { success: true, id: data.id }
}

export async function deletePropertyChecklist(checklistId: string, propertyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Also delete all items in this checklist
  await supabase.from('property_checklist_items').delete().eq('checklist_id', checklistId)
  const { error } = await supabase.from('property_checklists').delete().eq('id', checklistId)
  if (error) return { error: error.message }

  revalidatePath(`/properties/${propertyId}`)
  return { success: true }
}

export async function toggleChecklistEnabled(checklistId: string, enabled: boolean, propertyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase.from('property_checklists').update({ enabled }).eq('id', checklistId)
  if (error) return { error: error.message }
  revalidatePath(`/properties/${propertyId}`)
  return { success: true }
}

export async function saveChecklistItemsForChecklist(checklistId: string, propertyId: string, labels: string[]) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    await supabase.from('property_checklist_items').delete().eq('checklist_id', checklistId)

    if (labels.length > 0) {
      const items = labels
        .map((label, index) => ({ property_id: propertyId, checklist_id: checklistId, label: label.trim(), sort_order: index }))
        .filter(item => item.label.length > 0)
      const { error } = await supabase.from('property_checklist_items').insert(items)
      if (error) return { error: error.message }
    }

    revalidatePath(`/properties/${propertyId}`)
    return { success: true }
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || err.message === 'NEXT_NOT_FOUND')) throw err
    return { error: err instanceof Error ? err.message : 'Failed to save' }
  }
}

export async function resetChecklistChecksForChecklist(checklistId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  await supabase.from('property_checklist_items').update({ is_checked: false }).eq('checklist_id', checklistId)
  return { success: true }
}

// ---- Seed default CATEGORY checklists for a new property ----

export async function seedDefaultCategoryChecklists(propertyId: string) {
  const supabase = await createClient()

  // Check if any checklists already exist for this property
  const { data: existing } = await supabase
    .from('property_checklists')
    .select('id')
    .eq('property_id', propertyId)
    .limit(1)

  if (existing && existing.length > 0) return { seeded: false }

  for (let sortOrder = 0; sortOrder < DEFAULT_CATEGORY_CHECKLISTS.length; sortOrder++) {
    const def = DEFAULT_CATEGORY_CHECKLISTS[sortOrder]
    const { data: checklist, error } = await supabase
      .from('property_checklists')
      .insert({ property_id: propertyId, name: def.name, category: def.category, sort_order: sortOrder })
      .select('id')
      .single()

    if (error || !checklist) continue

    const items = def.items.map((label, idx) => ({
      property_id: propertyId,
      checklist_id: checklist.id,
      label,
      sort_order: idx,
    }))
    await supabase.from('property_checklist_items').insert(items)
  }

  return { seeded: true }
}
