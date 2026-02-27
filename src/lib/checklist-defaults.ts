// Default checklist items used when a property has no custom items configured.
// Shared between server actions, components, and guest page (no 'use server' needed).

export type DefaultCategoryChecklist = { name: string; category: string; items: string[] }

export const DEFAULT_CATEGORY_CHECKLISTS: DefaultCategoryChecklist[] = [
  {
    name: 'Cleaning Checklist',
    category: 'cleaning',
    items: [
      'All rooms vacuumed and floors mopped',
      'Bathrooms cleaned and sanitized',
      'Kitchen cleaned — appliances, counters, sink',
      'Trash removed and bins relined',
      'Linens and towels replaced with clean sets',
      'All beds made with fresh linens',
      'Dishes cleaned and put away',
      'Refrigerator cleared of guest items',
      'Windows and mirrors wiped down',
      'Restocked consumables (toiletries, paper goods)',
      'Locks, windows, and entry points secure',
    ],
  },
  {
    name: 'Maintenance Checklist',
    category: 'maintenance',
    items: [
      'Check/replace HVAC filter',
      'Test smoke and CO detectors',
      'Check all appliances are functioning',
      'Inspect plumbing for leaks',
      'Test all light fixtures and replace bulbs',
      'Check windows and door seals',
      'Inspect exterior for damage',
      'Test fire extinguisher gauge',
    ],
  },
  {
    name: 'Landscaping Checklist',
    category: 'landscaping',
    items: [
      'Mow lawn',
      'Edge driveway and walkways',
      'Trim hedges and bushes',
      'Clear debris from yard',
      'Blow/rake leaves (seasonal)',
      'Check sprinkler/irrigation system',
    ],
  },
]

export const CATEGORY_COLORS: Record<string, { border: string; text: string; bg: string; badge: string }> = {
  cleaning: { border: 'border-teal-500/30', text: 'text-teal-400', bg: 'bg-teal-500/10', badge: 'bg-teal-500/20 text-teal-300' },
  maintenance: { border: 'border-amber-500/30', text: 'text-amber-400', bg: 'bg-amber-500/10', badge: 'bg-amber-500/20 text-amber-300' },
  landscaping: { border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10', badge: 'bg-emerald-500/20 text-emerald-300' },
  general: { border: 'border-violet-500/30', text: 'text-violet-400', bg: 'bg-violet-500/10', badge: 'bg-violet-500/20 text-violet-300' },
  other: { border: 'border-[#2a3d58]', text: 'text-[#8aa0be]', bg: 'bg-[#1a2436]', badge: 'bg-[#2a3d58] text-[#94a3b8]' },
}

export const CATEGORY_LABELS: Record<string, string> = {
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
  landscaping: 'Landscaping',
  general: 'General',
  other: 'Other',
}

export const DEFAULT_CHECKLIST_LABELS = [
  'All rooms vacuumed and floors mopped',
  'Bathrooms cleaned and sanitized',
  'Kitchen cleaned — appliances, counters, sink',
  'Trash removed and bins relined',
  'Linens and towels replaced with clean sets',
  'All beds made with fresh linens',
  'Dishes cleaned and put away',
  'Refrigerator cleared of guest items',
  'Windows and mirrors wiped down',
  'All lights and appliances functioning',
  'HVAC filters checked',
  'No visible damage or maintenance issues',
  'Locks, windows, and entry points secure',
  'Restocked consumables (toiletries, paper goods)',
]
