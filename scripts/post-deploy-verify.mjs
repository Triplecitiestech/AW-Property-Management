#!/usr/bin/env node
/**
 * Post-Deploy Verification — AW Property Management
 *
 * Runs AFTER a Vercel deploy to verify the production environment is healthy.
 * Exits 0 only if ALL checks pass; otherwise prints a clear error and exits 1.
 *
 * Required environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL    — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY   — service-role key (never printed)
 *   TWILIO_ACCOUNT_SID          — Twilio account SID
 *   TWILIO_AUTH_TOKEN            — Twilio auth token (never printed)
 *   TWILIO_PHONE_NUMBER         — The phone number to verify webhook config on
 *   EXPECTED_TWILIO_WEBHOOK_URL — Exact URL the SMS webhook must be set to
 *   APP_URL                     — Production app URL (e.g. https://smartsumai.com)
 */

// ─── Required env vars ─────────────────────────────────────────────────────────

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'EXPECTED_TWILIO_WEBHOOK_URL',
  'APP_URL',
]

// ─── Required tables (must match deploy.sql + smoke-test.mjs) ───────────────

const REQUIRED_TABLES = [
  'profiles',
  'properties',
  'property_status',
  'stays',
  'service_requests',
  'service_request_comments',
  'guest_reports',
  'audit_log',
  'property_checklist_items',
  'property_contacts',
  'organizations',
  'org_members',
  'property_access',
  'invitations',
  'error_logs',
  'conversations',
  'ai_usage',
]

// ─── Helpers ────────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function pass(name) {
  console.log(`  [PASS] ${name}`)
  passed++
}

function fail(name, reason) {
  console.error(`  [FAIL] ${name}: ${reason}`)
  failed++
}

function mask(value) {
  if (!value || value.length < 10) return '***'
  return '***' + value.slice(-6)
}

// ─── Check D: Environment variables exist ───────────────────────────────────

function checkEnvVars() {
  console.log('\n=== Check D: Required environment variables ===')
  const missing = REQUIRED_ENV.filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.error(`\nFATAL: Missing required environment variables:\n  ${missing.join('\n  ')}`)
    console.error('\nCannot proceed — exiting.')
    process.exit(1)
  }
  pass(`All ${REQUIRED_ENV.length} required env vars present`)
  // Print masked identifiers for debugging
  console.log(`    Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log(`    Supabase key: ${mask(process.env.SUPABASE_SERVICE_ROLE_KEY)}`)
  console.log(`    Twilio SID:   ${mask(process.env.TWILIO_ACCOUNT_SID)}`)
  console.log(`    Twilio token: ${mask(process.env.TWILIO_AUTH_TOKEN)}`)
  console.log(`    Phone:        ${process.env.TWILIO_PHONE_NUMBER}`)
  console.log(`    Webhook URL:  ${process.env.EXPECTED_TWILIO_WEBHOOK_URL}`)
  console.log(`    App URL:      ${process.env.APP_URL}`)
}

// ─── Check A: Supabase connectivity + schema ────────────────────────────────

async function checkSupabaseSchema() {
  console.log('\n=== Check A: Supabase connectivity + schema ===')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Call the list_public_tables RPC function
  let tableNames
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/list_public_tables`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })

    if (!res.ok) {
      const text = await res.text()
      fail('Supabase RPC call', `HTTP ${res.status}: ${text.slice(0, 200)}`)
      return
    }

    const data = await res.json()
    tableNames = data.map((row) => row.table_name)
    pass(`Supabase reachable — found ${tableNames.length} public tables`)
  } catch (err) {
    fail('Supabase connectivity', err.message)
    return
  }

  // Verify all required tables exist
  const missingTables = REQUIRED_TABLES.filter((t) => !tableNames.includes(t))
  if (missingTables.length > 0) {
    fail('Schema completeness', `Missing tables: ${missingTables.join(', ')}`)
  } else {
    pass(`All ${REQUIRED_TABLES.length} required tables present`)
  }
}

// ─── Check B: Twilio webhook URL matches expected ───────────────────────────

async function checkTwilioWebhook() {
  console.log('\n=== Check B: Twilio webhook URL ===')

  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const phone = process.env.TWILIO_PHONE_NUMBER
  const expectedUrl = process.env.EXPECTED_TWILIO_WEBHOOK_URL
  const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')

  // Look up the phone number SID
  let numSid
  try {
    const encodedPhone = encodeURIComponent(phone)
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json?PhoneNumber=${encodedPhone}`,
      { headers: { 'Authorization': authHeader } }
    )

    if (!res.ok) {
      fail('Twilio phone lookup', `HTTP ${res.status}`)
      return
    }

    const data = await res.json()
    const numbers = data.incoming_phone_numbers || []
    if (numbers.length === 0) {
      fail('Twilio phone lookup', `No phone number found for ${phone}`)
      return
    }

    numSid = numbers[0].sid
    const configuredUrl = numbers[0].sms_url || ''

    pass(`Phone ${phone} found (SID: ${mask(numSid)})`)

    // Compare webhook URL
    if (configuredUrl === expectedUrl) {
      pass(`SMS webhook URL matches: ${expectedUrl}`)
    } else {
      fail('SMS webhook URL mismatch', `Expected "${expectedUrl}", got "${configuredUrl}"`)
    }
  } catch (err) {
    fail('Twilio API', err.message)
  }
}

// ─── Check C: Production app health endpoint ────────────────────────────────

async function checkAppHealth() {
  console.log('\n=== Check C: Production app health ===')

  const appUrl = process.env.APP_URL

  // Retry up to 3 times with 10s delay (alias propagation)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${appUrl}/api/health`, { signal: AbortSignal.timeout(15000) })

      if (res.ok) {
        const data = await res.json()
        if (data.ok === true) {
          pass(`Health endpoint returned 200 { ok: true } (attempt ${attempt})`)
          return
        }
        fail('Health endpoint', `Returned 200 but ok=${data.ok}, error: ${data.error || 'none'}`)
        return
      }

      if (attempt < 3) {
        console.log(`    Attempt ${attempt}: HTTP ${res.status} — retrying in 10s...`)
        await new Promise((r) => setTimeout(r, 10000))
        continue
      }

      fail('Health endpoint', `HTTP ${res.status} after ${attempt} attempts`)
    } catch (err) {
      if (attempt < 3) {
        console.log(`    Attempt ${attempt}: ${err.message} — retrying in 10s...`)
        await new Promise((r) => setTimeout(r, 10000))
        continue
      }
      fail('Health endpoint', `${err.message} after ${attempt} attempts`)
    }
  }
}

// ─── Check E: Runtime env vars on deployed app (/api/envcheck) ──────────────

async function checkRuntimeEnv() {
  console.log('\n=== Check E: Runtime environment variables (Vercel) ===')

  const appUrl = process.env.APP_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  try {
    const res = await fetch(`${appUrl}/api/envcheck`, {
      headers: { 'Authorization': `Bearer ${serviceKey}` },
      signal: AbortSignal.timeout(15000),
    })

    if (res.status === 401) {
      fail('Runtime envcheck', 'Returned 401 — SUPABASE_SERVICE_ROLE_KEY in CI does not match the deployed app. Fix in Vercel (project > settings > environment variables > Production scope).')
      return
    }

    if (!res.ok) {
      fail('Runtime envcheck', `HTTP ${res.status}`)
      return
    }

    const data = await res.json()
    if (data.ok === true) {
      pass(`All runtime env vars present on ${data.environment}`)
      return
    }

    // Report which keys are missing, with system attribution
    const missingKeys = Object.entries(data.present || {})
      .filter(([, v]) => v === false)
      .map(([k]) => k)

    if (missingKeys.length > 0) {
      const detail = missingKeys.map((k) => {
        if (k.startsWith('NEXT_PUBLIC_')) return `${k} (set in: Vercel project env vars, scope: Production — rebuild required)`
        if (k.startsWith('STRIPE_')) return `${k} (set in: Vercel project env vars, scope: Production)`
        if (k.startsWith('TWILIO_')) return `${k} (set in: Vercel project env vars, scope: Production)`
        if (k.startsWith('RESEND_') || k === 'NOTIFY_EMAIL') return `${k} (set in: Vercel project env vars, scope: Production)`
        if (k === 'SUPABASE_SERVICE_ROLE_KEY') return `${k} (set in: Vercel project env vars, scope: Production)`
        if (k === 'ANTHROPIC_API_KEY') return `${k} (set in: Vercel project env vars, scope: Production)`
        return `${k} (set in: Vercel project env vars)`
      })
      fail('Runtime env vars missing on Vercel', `\n      ${detail.join('\n      ')}`)
    }
  } catch (err) {
    fail('Runtime envcheck', err.message)
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n========================================')
  console.log(' Post-Deploy Verification')
  console.log('========================================')

  // Check D first — env vars must be present before anything else
  checkEnvVars()

  // Run checks A, B, C, E
  await checkSupabaseSchema()
  await checkTwilioWebhook()
  await checkAppHealth()
  await checkRuntimeEnv()

  // Summary
  console.log(`\n${'─'.repeat(40)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log(`${'─'.repeat(40)}\n`)

  if (failed > 0) {
    console.error('Post-deploy verification FAILED — see errors above.')
    process.exit(1)
  }

  console.log('Post-deploy verification PASSED.')
}

main().catch((err) => {
  console.error('Fatal error in post-deploy-verify:', err)
  process.exit(1)
})
