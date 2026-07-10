#!/usr/bin/env node
/**
 * CI Branding Guard — Smart Sumai
 *
 * Fails the build if legacy brand names appear in user-facing source code.
 * Run: node scripts/check-branding.mjs
 *
 * Scans src/ for:
 *   - "AW Property" (old brand name)
 *   - "Smart Sumi" (misspelling — correct is "Smart Sumai")
 *
 * Exclusions:
 *   - node_modules, .next, .git, package-lock.json
 *   - Binary files (images, fonts)
 *   - This script itself
 */

import { readdir, readFile } from 'fs/promises'
import { join, relative } from 'path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const SCAN_DIRS = ['src']

const FORBIDDEN = [
  { pattern: /AW Property/gi, label: 'AW Property' },
  { pattern: /Smart Sumi(?!ai)/gi, label: 'Smart Sumi (should be "Smart Sumai")' },
]

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build'])
const SKIP_FILES = new Set(['check-branding.mjs', 'package-lock.json'])
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.pdf'])

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (SKIP_DIRS.has(entry.name)) continue
    if (entry.isDirectory()) {
      yield* walk(full)
    } else if (!SKIP_FILES.has(entry.name)) {
      const ext = entry.name.includes('.') ? '.' + entry.name.split('.').pop().toLowerCase() : ''
      if (!BINARY_EXT.has(ext)) {
        yield full
      }
    }
  }
}

let violations = 0

for (const scanDir of SCAN_DIRS) {
  const fullDir = join(ROOT, scanDir)
  for await (const filePath of walk(fullDir)) {
    const content = await readFile(filePath, 'utf-8')
    const rel = relative(ROOT, filePath)
    for (const { pattern, label } of FORBIDDEN) {
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length
        console.error(`  VIOLATION: ${rel}:${lineNum} — found "${match[0]}" (${label})`)
        violations++
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n✗ ${violations} branding violation(s) found. All user-facing text must use "Smart Sumai".\n`)
  process.exit(1)
} else {
  console.log('✓ Branding check passed — no legacy references found in src/')
  process.exit(0)
}
