'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// Sign out after 30 minutes of inactivity (SOC 2 session timeout requirement)
const TIMEOUT_MS = 30 * 60 * 1000

export default function InactivityTimer() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        await supabase.auth.signOut()
        window.location.href = '/auth/login?reason=timeout'
      }, TIMEOUT_MS)
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(e => document.removeEventListener(e, resetTimer))
    }
  }, [])

  return null
}
