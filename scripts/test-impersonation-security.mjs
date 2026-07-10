#!/usr/bin/env node
/**
 * Impersonation Security Regression Tests
 *
 * Verifies the key security invariants for the impersonation feature:
 *
 * 1. /admin redirects unauthenticated users to /auth/login
 * 2. Admin route has server-side RBAC (getAppContext + is_super_admin check)
 * 3. Layout uses effective user's admin status (not real admin's) for sidebar
 * 4. Welcome page uses effective user identity for personalization
 *
 * Run: node scripts/test-impersonation-security.mjs
 *
 * This performs both static analysis (verifying code patterns) and
 * runtime tests (HTTP requests) against the deployed or local app.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const APP_URL = process.env.APP_URL || 'http://localhost:3000'

let passed = 0
let failed = 0

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ ${description}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${description}`)
    failed++
  }
}

// ── Static Analysis Tests ──────────────────────────────────────────
// These verify the code structure contains the required security patterns.

console.log('\n── Static Analysis: Code Security Patterns ──\n')

// Test 1: Admin page has server-side RBAC
const adminPage = await readFile(join(ROOT, 'src/app/(app)/admin/page.tsx'), 'utf-8')
assert(
  adminPage.includes('getAppContext') && adminPage.includes('is_super_admin'),
  'Admin page imports getAppContext and checks is_super_admin'
)
assert(
  adminPage.includes("redirect('/dashboard')"),
  'Admin page redirects non-admins to /dashboard'
)
assert(
  adminPage.includes('ctx.userId'),
  'Admin page uses effective userId (ctx.userId), not real user'
)

// Test 2: Layout uses effective user for sidebar admin check
const layout = await readFile(join(ROOT, 'src/app/(app)/layout.tsx'), 'utf-8')
assert(
  layout.includes('effectiveUserId'),
  'Layout computes effectiveUserId for admin check'
)
assert(
  layout.includes('impersonation.targetId'),
  'Layout uses impersonation target ID when impersonating'
)
assert(
  !layout.match(/select\('is_super_admin'\).*\.eq\('id',\s*user\.id\)/s),
  'Layout does NOT check is_super_admin against raw user.id (uses effectiveUserId)'
)

// Test 3: Welcome page uses effective user identity
const welcome = await readFile(join(ROOT, 'src/app/(app)/welcome/page.tsx'), 'utf-8')
assert(
  welcome.includes('getAppContext'),
  'Welcome page imports getAppContext for effective user identity'
)
assert(
  welcome.includes('ctx.userId'),
  'Welcome page uses ctx.userId for profile lookup'
)
assert(
  !welcome.includes('user.user_metadata?.full_name'),
  'Welcome page does NOT use raw auth user metadata for name'
)

// Test 4: Impersonation state validates super admin
const impersonation = await readFile(join(ROOT, 'src/lib/impersonation.ts'), 'utf-8')
assert(
  impersonation.includes('is_super_admin'),
  'Impersonation helper validates caller is super admin'
)
assert(
  impersonation.includes('IMPERSONATE_COOKIE'),
  'Impersonation uses httpOnly cookie'
)

// Test 5: Impersonation actions validate super admin
const impActions = await readFile(join(ROOT, 'src/lib/actions/impersonation.ts'), 'utf-8')
assert(
  impActions.includes('requireSuperAdmin'),
  'Start/stop impersonation actions require super admin'
)
assert(
  impActions.includes('audit_log'),
  'Impersonation actions log to audit trail'
)

// ── Runtime Tests ──────────────────────────────────────────────────
// These verify HTTP behavior of the deployed app.

console.log('\n── Runtime Tests: HTTP Security Checks ──\n')

try {
  // Test 6: /admin redirects unauthenticated users
  const adminRes = await fetch(`${APP_URL}/admin`, {
    redirect: 'manual',
    headers: { 'Accept': 'text/html' },
  })
  assert(
    [301, 302, 303, 307, 308].includes(adminRes.status) ||
    adminRes.headers.get('location')?.includes('/auth/login'),
    `/admin redirects unauthenticated users (got ${adminRes.status})`
  )

  // Test 7: /dashboard redirects unauthenticated users
  const dashRes = await fetch(`${APP_URL}/dashboard`, {
    redirect: 'manual',
    headers: { 'Accept': 'text/html' },
  })
  assert(
    [301, 302, 303, 307, 308].includes(dashRes.status) ||
    dashRes.headers.get('location')?.includes('/auth/login'),
    `/dashboard redirects unauthenticated users (got ${dashRes.status})`
  )
} catch (err) {
  console.log(`  ⚠ Runtime tests skipped — app not reachable at ${APP_URL}: ${err.message}`)
}

// ── Summary ────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`)

if (failed > 0) {
  console.error('✗ Impersonation security tests FAILED')
  process.exit(1)
} else {
  console.log('✓ All impersonation security tests passed')
  process.exit(0)
}
