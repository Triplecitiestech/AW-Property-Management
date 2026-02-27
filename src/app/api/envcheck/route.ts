import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Runtime environment check — reports which required env vars are present
 * in the deployed Vercel app. Returns booleans only, never values.
 *
 * Secured: requires Authorization header matching SUPABASE_SERVICE_ROLE_KEY.
 * This is the same key CI already has, so no new secret is needed.
 * The key is never exposed to the client (server-only runtime var).
 */

const REQUIRED_RUNTIME_KEYS = [
  // Build-time (NEXT_PUBLIC_*) — baked into bundle
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  // Server-only runtime
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'NOTIFY_EMAIL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
]

export async function GET(req: NextRequest) {
  // Auth: require Bearer token matching SUPABASE_SERVICE_ROLE_KEY
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const present: Record<string, boolean> = {}
  let allPresent = true

  for (const key of REQUIRED_RUNTIME_KEYS) {
    const val = process.env[key]
    const isSet = val !== undefined && val !== '' && val !== 'undefined'
    present[key] = isSet
    if (!isSet) allPresent = false
  }

  return NextResponse.json({
    ok: allPresent,
    present,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
  })
}
