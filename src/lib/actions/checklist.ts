'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CHECKLIST_LABELS } from '@/lib/checklist-defaults'

export { DEFAULT_CHECKLIST_LABELS }

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Delete existing
  await supabase.from('property_checklist_items').delete().eq('property_id', propertyId)

  // Insert new items
  if (labels.length > 0) {
    const items = labels
      .map((label, index) => ({ property_id: propertyId, label: label.trim(), sort_order: index }))
      .filter(item => item.label.length > 0)

    const { error } = await supabase.from('property_checklist_items').insert(items)
    if (error) return { error: error.message }
  }

  revalidatePath(`/properties/${propertyId}`)
  return { success: true }
}

// ---- Reset to defaults ----

export async function resetChecklistToDefaults(propertyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  await supabase.from('property_checklist_items').delete().eq('property_id', propertyId)

  revalidatePath(`/properties/${propertyId}`)
  return { success: true }
}
