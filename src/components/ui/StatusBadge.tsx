/**
 * Unified badge component for status, priority, and custom labels.
 *
 * Uses the .badge CSS classes defined in globals.css.
 * Status values map directly to .badge-{value} classes.
 */

type BadgeVariant = 'status' | 'priority' | 'custom'

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

  return <span className={`badge badge-${value}`}>{formatLabel(value)}</span>
}
