// Shared contact role definitions — imported by both server actions and client components

export const CONTACT_ROLES = [
  { value: 'primary',      label: 'Primary Manager' },
  { value: 'maintenance',  label: 'General Maintenance' },
  { value: 'plumbing',     label: 'Plumbing' },
  { value: 'hvac',         label: 'HVAC' },
  { value: 'electrical',   label: 'Electrical' },
  { value: 'cleaning',     label: 'Cleaning' },
  { value: 'landscaping',  label: 'Landscaping' },
  { value: 'groceries',    label: 'Groceries / Resupply' },
  { value: 'other',        label: 'Other' },
] as const

export type ContactRole = (typeof CONTACT_ROLES)[number]['value']
