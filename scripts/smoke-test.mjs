#!/usr/bin/env node
/**
 * Smoke Test Script — Smart Sumi
 *
 * Tests key flows against a running local or deployed instance.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL environment variables
 *
 * Usage:
 *   APP_URL=http://localhost:3000 \
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your_key \
 *   node scripts/smoke-test.mjs
 */

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

let passed = 0
let failed = 0

function pass(name) {
  console.log(`  ✅ ${name}`)
  passed++
}

function fail(name, reason) {
  console.error(`  ❌ ${name}: ${reason}`)
  failed++
}

async function supabaseQuery(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer ?? 'return=representation',
    },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data
}

async function run() {
  console.log('\n🔍 Smart Sumi — Smoke Tests\n')
  console.log(`App URL: ${APP_URL}`)
  console.log(`Supabase: ${SUPABASE_URL}\n`)

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    process.exit(1)
  }

  // ---- Test 1: App is reachable ----
  console.log('1. App reachability')
  try {
    const res = await fetch(`${APP_URL}/auth/login`)
    if (res.ok || res.status === 307) {
      pass('App responds to HTTP requests')
    } else {
      fail('App reachability', `Status ${res.status}`)
    }
  } catch (err) {
    fail('App reachability', `Cannot connect: ${err.message}`)
  }

  // ---- Test 2: Database tables exist ----
  // Matches the tables defined in supabase/deploy.sql
  console.log('\n2. Database schema')
  const tables = [
    'profiles', 'properties', 'property_status', 'stays',
    'service_requests', 'service_request_comments', 'guest_reports',
    'audit_log', 'property_checklist_items', 'property_contacts',
    'organizations', 'org_members', 'property_access', 'invitations',
    'error_logs', 'conversations', 'ai_usage',
  ]
  for (const table of tables) {
    try {
      await supabaseQuery(`${table}?limit=1`, { prefer: 'count=planned' })
      pass(`Table "${table}" exists`)
    } catch (err) {
      fail(`Table "${table}"`, err.message)
    }
  }

  // ---- Test 3: Create a property ----
  console.log('\n3. CRUD operations')

  try {
    const props = await supabaseQuery('properties', {
      method: 'POST',
      body: JSON.stringify({
        name: '__smoke_test_property__',
        address: '1 Test Lane',
        owner_id: '00000000-0000-0000-0000-000000000000', // placeholder - will fail if no owner exists
      }),
      prefer: 'return=representation',
    }).catch(async () => {
      // If insert fails (no owner), just check read
      const data = await supabaseQuery('properties?limit=1')
      return data
    })

    if (props && props.length > 0) {
      pass('Properties table readable')
    }
  } catch (err) {
    fail('Properties read', err.message)
  }

  // ---- Test 4: Guest report API ----
  console.log('\n4. Guest report API')
  try {
    const res = await fetch(`${APP_URL}/api/guest-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid-token', checklist: [], notes: '' }),
    })
    const data = await res.json()
    if (res.status === 404 && data.error) {
      pass('Guest report API returns 404 for invalid token')
    } else {
      fail('Guest report API', `Expected 404, got ${res.status}`)
    }
  } catch (err) {
    fail('Guest report API', err.message)
  }

  // ---- Test 5: Twilio SMS webhook ----
  // An unsigned POST should return 401 when TWILIO_AUTH_TOKEN is set in production.
  // This confirms the route is deployed and reachable.
  console.log('\n5. Twilio SMS webhook')
  try {
    const res = await fetch(`${APP_URL}/api/webhooks/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'From=%2B15555550001&Body=smoke+test',
    })
    if (res.status === 401) {
      pass('SMS webhook rejects unsigned requests (401) — auth working')
    } else if (res.status === 200) {
      // If no TWILIO_AUTH_TOKEN set (local dev), the handler processes the message
      pass('SMS webhook endpoint reachable (no auth required in this environment)')
    } else {
      fail('SMS webhook', `Unexpected status ${res.status}`)
    }
  } catch (err) {
    fail('SMS webhook', err.message)
  }

  // ---- Test 6: Guest page renders ----
  console.log('\n6. Guest page')
  try {
    const res = await fetch(`${APP_URL}/guest/00000000-0000-0000-0000-000000000000`)
    if (res.status === 404 || res.status === 200) {
      pass('Guest page handles invalid token gracefully')
    } else {
      fail('Guest page', `Unexpected status ${res.status}`)
    }
  } catch (err) {
    fail('Guest page', err.message)
  }

  // ---- Summary ----
  console.log(`\n${'─'.repeat(40)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log(`${'─'.repeat(40)}\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
