'use client'

/**
 * Renders a date/time string in the user's local browser timezone.
 * Must be a client component — server-side toLocaleDateString() uses UTC.
 * suppressHydrationWarning prevents React from complaining about the
 * server (UTC) vs client (local) mismatch.
 */
export default function LocalDate({
  iso,
  showTime = false,
}: {
  iso: string
  showTime?: boolean
}) {
  const d = new Date(iso)
  return (
    <span suppressHydrationWarning>
      {showTime ? d.toLocaleString() : d.toLocaleDateString()}
    </span>
  )
}
