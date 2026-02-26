/**
 * Client-side error logger. Posts to /api/log-error which persists to Supabase.
 * Never throws — logging must never break the app.
 */
export async function logError(opts: {
  source: 'client' | 'server' | 'action'
  route?: string
  message: string
  stack?: string
  metadata?: Record<string, unknown>
}) {
  try {
    await fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    })
  } catch {
    // Never throw
  }
}
