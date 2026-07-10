import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Health check endpoint — confirms the app is running and can reach Supabase.
 * Used by post-deploy verification in CI.
 *
 * Returns 200 { ok: true } if Supabase responds to a simple query.
 * Returns 503 { ok: false, error: "..." } if anything fails.
 */
export async function GET() {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 503 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 503 })
  }
}
