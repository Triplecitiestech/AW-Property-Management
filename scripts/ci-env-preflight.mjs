#!/usr/bin/env node
/**
 * CI Environment Preflight — Smart Sumai
 *
 * Runs as the FIRST step in deploy.yml, BEFORE migrations/Twilio/deploy.
 * Verifies that all required CI environment variables exist and are non-empty.
 * Never prints secret values — only reports missing/empty key names.
 *
 * Exit 0: all required vars present and non-empty.
 * Exit 1: at least one required var is missing or empty (prints which ones).
 */

// ─── Required CI env vars ───────────────────────────────────────────────────
// Derived from deploy.yml env block, assembled credentials, and scripts that
// run during the deploy pipeline. Grouped by system.

const REQUIRED = [
  // Supabase (migration + schema verification + env push to Vercel)
  { key: 'NEXT_PUBLIC_SUPABASE_URL',   system: 'Supabase' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', system: 'Supabase' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY',  system: 'Supabase' },
  { key: 'SUPABASE_ACCESS_TOKEN',      system: 'Supabase' },
  { key: 'SUPABASE_PROJECT_REF',       system: 'Supabase' },

  // Twilio (webhook config + post-deploy verification)
  { key: 'TWILIO_ACCOUNT_SID',         system: 'Twilio' },
  { key: 'TWILIO_AUTH_TOKEN',          system: 'Twilio' },
  { key: 'TWILIO_PHONE_NUMBER',        system: 'Twilio' },
  { key: 'EXPECTED_TWILIO_WEBHOOK_URL', system: 'GitHub Actions (deploy.yml env block)' },

  // Vercel (deploy + env push)
  { key: 'VERCEL_TOKEN',               system: 'Vercel' },

  // App config (baked into bundle + pushed to Vercel)
  { key: 'NEXT_PUBLIC_APP_URL',        system: 'GitHub Actions (deploy.yml env block)' },
  { key: 'RESEND_API_KEY',             system: 'Resend' },
  { key: 'RESEND_FROM_EMAIL',          system: 'GitHub Actions (deploy.yml env block)' },
  { key: 'NOTIFY_EMAIL',               system: 'GitHub Actions (deploy.yml env block)' },
  { key: 'ANTHROPIC_API_KEY',          system: 'Anthropic' },
]

// ─── Check ──────────────────────────────────────────────────────────────────

const missing = []
const empty = []

for (const { key, system } of REQUIRED) {
  const val = process.env[key]
  if (val === undefined) {
    missing.push({ key, system })
  } else if (val.trim() === '') {
    empty.push({ key, system })
  }
}

if (missing.length === 0 && empty.length === 0) {
  console.log(`CI ENV PREFLIGHT PASSED: all ${REQUIRED.length} required variables present.`)
  process.exit(0)
}

// ─── Failure output ─────────────────────────────────────────────────────────

console.error('CI ENV PREFLIGHT FAILED:')

for (const { key, system } of missing) {
  console.error(`  - Missing: ${key}  (set in: ${system})`)
}
for (const { key, system } of empty) {
  console.error(`  - Empty:   ${key}  (set in: ${system})`)
}

console.error('')
console.error('Fix: check the env/secrets block in .github/workflows/deploy.yml')
console.error('     and the "Assemble credentials" step.')
console.error('')
console.error('Exiting 1.')
process.exit(1)
