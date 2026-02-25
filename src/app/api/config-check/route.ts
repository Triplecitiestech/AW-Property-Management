import { NextResponse } from 'next/server'
import { SUPABASE_URL } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic endpoint — returns what Supabase URL is actually compiled
 * into the live bundle. Used by the deploy workflow to verify the correct
 * value made it into production.
 */
export async function GET() {
  return NextResponse.json({
    supabaseUrl: SUPABASE_URL,
    supabaseUrlSet: SUPABASE_URL !== 'undefined' && !!SUPABASE_URL,
    deployMarker: 'config-fix-2026-02-25',
  })
}
