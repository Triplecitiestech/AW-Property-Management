import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Data retention cleanup endpoint (SOC 2 — data minimization)
// Secured by the service role key as a bearer token.
// Called daily by .github/workflows/cleanup.yml
//
// Retention policy:
//   conversations  — 90 days
//   error_logs     — 30 days (resolved), 90 days (unresolved)

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const expectedToken = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()
  const results: Record<string, number> = {}

  try {
    // 1. Delete conversations older than 90 days
    const conversations90dAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { error: convErr, count: convCount } = await svc
      .from('conversations')
      .delete({ count: 'exact' })
      .lt('created_at', conversations90dAgo)
    if (convErr) console.error('[cleanup] conversations delete error:', convErr.message)
    results.conversations_deleted = convCount ?? 0

    // 2. Delete resolved error_logs older than 30 days
    const errorLogs30dAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { error: errResolvedErr, count: errResolvedCount } = await svc
      .from('error_logs')
      .delete({ count: 'exact' })
      .eq('resolved', true)
      .lt('created_at', errorLogs30dAgo)
    if (errResolvedErr) console.error('[cleanup] error_logs (resolved) delete error:', errResolvedErr.message)
    results.error_logs_resolved_deleted = errResolvedCount ?? 0

    // 3. Delete unresolved error_logs older than 90 days
    const errorLogs90dAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { error: errOldErr, count: errOldCount } = await svc
      .from('error_logs')
      .delete({ count: 'exact' })
      .eq('resolved', false)
      .lt('created_at', errorLogs90dAgo)
    if (errOldErr) console.error('[cleanup] error_logs (old unresolved) delete error:', errOldErr.message)
    results.error_logs_old_deleted = errOldCount ?? 0

    return NextResponse.json({ ok: true, deleted: results, ran_at: new Date().toISOString() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cleanup] unexpected error:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
