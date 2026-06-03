import type { ChecklistItem } from '@/lib/supabase/types'

// Bounds for the public, unauthenticated guest-report submission. Kept here so
// the limits are shared between the API route and its tests.
export const MAX_CHECKLIST_ITEMS = 100
export const MAX_LABEL_LENGTH = 500
export const MAX_NOTES_LENGTH = 5000

/**
 * Coerce arbitrary JSON (from an untrusted public request) into a safe, bounded
 * checklist: drops non-array input, caps the item count and label length, forces
 * `checked` to a boolean, and removes entries without a usable label.
 */
export function sanitizeChecklist(input: unknown): ChecklistItem[] {
  if (!Array.isArray(input)) return []
  return input
    .slice(0, MAX_CHECKLIST_ITEMS)
    .map((item) => {
      const rawLabel = (item as { label?: unknown } | null)?.label
      const label = typeof rawLabel === 'string' ? rawLabel.slice(0, MAX_LABEL_LENGTH) : ''
      return { label, checked: Boolean((item as { checked?: unknown } | null)?.checked) }
    })
    .filter((item) => item.label.trim().length > 0)
}

/** Coerce arbitrary input into bounded notes text, or `undefined` when absent. */
export function sanitizeNotes(input: unknown): string | undefined {
  return typeof input === 'string' ? input.slice(0, MAX_NOTES_LENGTH) : undefined
}
