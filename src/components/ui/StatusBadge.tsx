/**
 * Unified badge component for status, priority, role, and custom labels.
 *
 * Uses the .badge CSS classes defined in globals.css.
 * Status values map directly to .badge-{value} classes.
 *
 * Variants:
 *   status   — .badge-{value}  (open, in_progress, clean, needs_cleaning, etc.)
 *   priority — .badge-{mapped} (urgent→badge-urgent, high→badge-high, etc.)
 *   role     — .badge-{value}  (cleaning, maintenance, plumbing, etc.)
 *   custom   — .badge + custom className
 */

type BadgeVariant = 'status' | 'priority' | 'role' | 'custom'

interface StatusBadgeProps {
  value: string
  variant?: BadgeVariant
  /** Custom CSS classes (only used with variant="custom") */
  className?: string
}

const PRIORITY_MAP: Record<string, string> = {
  urgent: 'badge-urgent',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default function StatusBadge({ value, variant = 'status', className }: StatusBadgeProps) {
  if (variant === 'custom' && className) {
    return <span className={`badge ${className}`}>{formatLabel(value)}</span>
  }

  if (variant === 'priority') {
    const cls = PRIORITY_MAP[value] ?? 'badge-low'
    return <span className={`badge ${cls}`}>{formatLabel(value)}</span>
  }

  // Both 'status' and 'role' use the same pattern: badge badge-{value}
  return <span className={`badge badge-${value}`}>{formatLabel(value)}</span>
}
