'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Create a single unit ──────────────────────────────────────────────────────

export async function createUnit(
  propertyId: string,
  identifier: string,
  name?: string,
  notes?: string,
  floor?: number,
): Promise<{ unit: { id: string; identifier: string } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!identifier?.trim()) return { error: 'Unit identifier is required.' }

  const { data, error } = await supabase
    .from('property_units')
    .insert({
      property_id: propertyId,
      identifier: identifier.trim().toUpperCase(),
      name: name?.trim() || null,
      notes: notes?.trim() || null,
      floor: floor ?? null,
    })
    .select('id, identifier')
    .single()

  if (error) {
    if (error.code === '23505') return { error: `Unit "${identifier.trim().toUpperCase()}" already exists on this property.` }
    return { error: error.message }
  }

  revalidatePath(`/properties/${propertyId}`)
  return { unit: data }
}

// ── Bulk create units (atomic — all-or-nothing) ───────────────────────────────

export async function bulkCreateUnits(
  propertyId: string,
  identifiers: string[],
): Promise<{ created: number; skipped: number } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!identifiers.length) return { error: 'No identifiers provided.' }
  if (identifiers.length > 1000) return { error: 'Maximum 1000 units per bulk import.' }

  // Fetch existing identifiers for this property to detect duplicates
  const { data: existing } = await supabase
    .from('property_units')
    .select('identifier')
    .eq('property_id', propertyId)

  const existingSet = new Set((existing ?? []).map(u => u.identifier))
  const newIdentifiers = identifiers.filter(id => !existingSet.has(id))
  const skipped = identifiers.length - newIdentifiers.length

  if (newIdentifiers.length === 0) {
    return { created: 0, skipped }
  }

  const rows = newIdentifiers.map((identifier, i) => ({
    property_id: propertyId,
    identifier,
    sort_order: (existing?.length ?? 0) + i,
  }))

  const { error } = await supabase.from('property_units').insert(rows)
  if (error) return { error: error.message }

  revalidatePath(`/properties/${propertyId}`)
  return { created: newIdentifiers.length, skipped }
}

// ── Update a unit ─────────────────────────────────────────────────────────────

export async function updateUnit(
  unitId: string,
  data: { identifier?: string; name?: string; notes?: string; floor?: number | null; is_active?: boolean },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const update: Record<string, unknown> = {}
  if (data.identifier !== undefined) update.identifier = data.identifier.trim().toUpperCase()
  if (data.name !== undefined) update.name = data.name.trim() || null
  if (data.notes !== undefined) update.notes = data.notes.trim() || null
  if (data.floor !== undefined) update.floor = data.floor
  if (data.is_active !== undefined) update.is_active = data.is_active

  const { error } = await supabase.from('property_units').update(update).eq('id', unitId)
  if (error) return { error: error.message }

  return {}
}

// ── Delete a unit ─────────────────────────────────────────────────────────────

export async function deleteUnit(unitId: string, propertyId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('property_units').delete().eq('id', unitId)
  if (error) return { error: error.message }

  revalidatePath(`/properties/${propertyId}`)
  return {}
}

// ── Get units for a property ──────────────────────────────────────────────────

export async function getUnitsForProperty(propertyId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('property_units')
    .select('id, identifier, name, floor, notes, is_active, sort_order')
    .eq('property_id', propertyId)
    .order('sort_order')
    .order('identifier')
  if (error) return []
  return data ?? []
}
