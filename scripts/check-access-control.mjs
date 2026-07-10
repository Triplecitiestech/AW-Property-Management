#!/usr/bin/env node

/**
 * CI Guard: Static analysis of access control patterns.
 *
 * Enforces:
 *  1. All (app) pages use getAppContext/requireAppContext (impersonation-aware)
 *     instead of bare createClient() for data queries.
 *  2. Admin layout checks is_super_admin.
 *  3. No (app) page accidentally bypasses tenant isolation.
 *
 * Exceptions:
 *  - admin/layout.tsx: uses createClient for auth + service client for admin check (correct pattern)
 *  - profile/page.tsx: user-specific page, createClient is acceptable
 *  - billing/page.tsx: user-specific page, createClient is acceptable
 *  - welcome/page.tsx: onboarding page, createClient is acceptable
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const appDir = path.join(root, 'src/app/(app)')

// Pages exempt from impersonation-aware context requirement
const EXEMPT_PAGES = new Set([
  'admin/layout.tsx',     // Uses own admin check pattern
  'admin/page.tsx',       // Uses getAppContext + extra admin check
  'profile/page.tsx',     // User-specific
  'billing/page.tsx',     // User-specific
  'welcome/page.tsx',     // Onboarding, user-specific
  'settings/page.tsx',    // Org management for logged-in user, not impersonation target
  'properties/new/page.tsx', // Client component only, no server data queries
])

let errors = 0
let warnings = 0
let checked = 0

function getAllPages(dir, base = '') {
  const pages = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      pages.push(...getAllPages(path.join(dir, entry.name), rel))
    } else if (entry.name === 'page.tsx' || entry.name === 'layout.tsx') {
      pages.push({ abs: path.join(dir, entry.name), rel })
    }
  }
  return pages
}

const pages = getAllPages(appDir)

for (const { abs, rel } of pages) {
  checked++
  const content = fs.readFileSync(abs, 'utf-8')

  // Skip exempt pages
  if (EXEMPT_PAGES.has(rel)) continue

  // Rule 1: Pages should use getAppContext or requireAppContext, not bare createClient
  const usesAppContext = content.includes('getAppContext') || content.includes('requireAppContext')
  const usesCreateClient = content.includes('createClient') && !content.includes('createServiceClient')
  const importsFromGuards = content.includes('@/lib/auth/guards')
  const importsFromImpersonation = content.includes('@/lib/impersonation')

  if (!usesAppContext && !importsFromGuards && !importsFromImpersonation) {
    // Check if this is a layout that just wraps children
    const isLayout = rel.endsWith('layout.tsx')
    if (isLayout) continue // Layouts may not need app context

    if (usesCreateClient) {
      console.error(`ERROR: ${rel} uses createClient() without getAppContext/requireAppContext`)
      console.error(`       This bypasses impersonation and tenant isolation.`)
      console.error(`       Fix: import { requireAppContext } from '@/lib/auth/guards'`)
      errors++
    }
  }

  // Rule 2: Detail pages ([id]) should ideally check property access
  const isDetailPage = rel.includes('[id]') && rel.endsWith('page.tsx')
  if (isDetailPage && usesAppContext && !content.includes('requirePropertyAccess')) {
    // This is a warning, not an error — RLS still protects, but defense-in-depth is better
    console.warn(`WARN:  ${rel} uses app context but doesn't call requirePropertyAccess`)
    console.warn(`       Consider adding requirePropertyAccess for defense-in-depth.`)
    warnings++
  }
}

// Rule 3: Verify admin layout has is_super_admin check
const adminLayout = path.join(appDir, 'admin/layout.tsx')
if (fs.existsSync(adminLayout)) {
  const content = fs.readFileSync(adminLayout, 'utf-8')
  if (!content.includes('is_super_admin')) {
    console.error(`ERROR: admin/layout.tsx does not check is_super_admin`)
    errors++
  }
}

// Rule 4: Verify (app) layout has auth check
const appLayout = path.join(appDir, 'layout.tsx')
if (fs.existsSync(appLayout)) {
  const content = fs.readFileSync(appLayout, 'utf-8')
  if (!content.includes('redirect') || !content.includes('getUser')) {
    console.error(`ERROR: (app)/layout.tsx does not have auth redirect`)
    errors++
  }
}

console.log('')
console.log(`Access control check: ${checked} files checked, ${errors} errors, ${warnings} warnings`)

if (errors > 0) {
  console.error('\nAccess control check FAILED.')
  process.exit(1)
} else {
  console.log('Access control check PASSED.')
}
