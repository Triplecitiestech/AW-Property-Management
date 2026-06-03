'use client'

import { useState } from 'react'

/**
 * Copies a value to the clipboard with brief "Copied!" feedback.
 * Used for guest links and other shareable URLs.
 */
export default function CopyLinkButton({
  value,
  label = 'Copy Link',
  className = 'btn-secondary text-sm w-full justify-center',
}: {
  value: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    // navigator.clipboard is undefined on insecure origins / older browsers.
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {
        /* clipboard unavailable — silently ignore */
      }
    )
  }

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {copied ? 'Copied!' : label}
    </button>
  )
}
