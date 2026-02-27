/**
 * Custom Playwright fixtures for E2E tests.
 *
 * Two modes:
 *   • CI (BROWSERBASE_API_KEY set): each test gets a fresh Browserbase cloud session,
 *     connected via CDP. Artifacts (screenshots, traces, recordings) are stored on
 *     Browserbase's dashboard automatically.
 *   • Local dev (no BROWSERBASE_API_KEY): uses a local Chromium browser launched by
 *     Playwright — no cloud account needed.
 *
 * Fixtures provided:
 *   • `page`        — basic page with console-error + network-failure tracking
 *   • `authedPage`  — same page, pre-logged in via UI (session saved to .auth/user.json
 *                     and reused across tests in the same run for speed)
 *   • `consoleErrors` — accumulated JS console errors for the current test
 *   • `networkFailures` — accumulated failed fetch/XHR requests for the current test
 */

import { test as base, chromium, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import Browserbase from '@browserbasehq/sdk'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_STATE_FILE = path.join(__dirname, '.auth/user.json')

// ─── Types ────────────────────────────────────────────────────────────────────

type NetworkFailure = { url: string; status: number; method: string }

type E2EFixtures = {
  page: Page
  authedPage: Page
  consoleErrors: string[]
  networkFailures: NetworkFailure[]
}

// ─── Helper: create browser (Browserbase or local) ────────────────────────────

async function createBrowser(): Promise<{ browser: Browser; sessionId?: string }> {
  const apiKey = process.env.BROWSERBASE_API_KEY
  const projectId = process.env.BROWSERBASE_PROJECT_ID

  if (apiKey && projectId) {
    const bb = new Browserbase({ apiKey })
    const session = await bb.sessions.create({ projectId })
    const browser = await chromium.connectOverCDP(session.connectUrl)
    return { browser, sessionId: session.id }
  }

  // Local fallback
  const browser = await chromium.launch()
  return { browser }
}

// ─── Base fixture extension ────────────────────────────────────────────────────

export const test = base.extend<E2EFixtures>({

  // Override the default `page` fixture with our tracked version
  page: async ({}, use) => {
    const { browser } = await createBrowser()
    const context = await browser.newContext({
      // Ignore HTTPS errors on preview deployments that may not have finalized certs
      ignoreHTTPSErrors: true,
    })
    const page = await context.newPage()

    const errors: string[] = []
    const failures: NetworkFailure[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Skip benign browser extension noise
        const text = msg.text()
        if (!text.includes('favicon') && !text.includes('extension::')) {
          errors.push(`[console.error] ${text}`)
        }
      }
    })

    page.on('pageerror', err => {
      errors.push(`[pageerror] ${err.message}`)
    })

    page.on('response', async response => {
      const status = response.status()
      const url = response.url()
      const method = response.request().method()
      // Flag 4xx/5xx on same-origin API calls
      if (status >= 400 && url.includes('/api/')) {
        failures.push({ url, status, method })
      }
    })

    // Attach error arrays as page metadata for access in tests
    ;(page as Page & { _e2eErrors: string[]; _e2eNetworkFailures: NetworkFailure[] })._e2eErrors = errors
    ;(page as Page & { _e2eErrors: string[]; _e2eNetworkFailures: NetworkFailure[] })._e2eNetworkFailures = failures

    await use(page)
    await browser.close()
  },

  consoleErrors: async ({ page }, use) => {
    await use((page as Page & { _e2eErrors: string[] })._e2eErrors ?? [])
  },

  networkFailures: async ({ page }, use) => {
    await use((page as Page & { _e2eNetworkFailures: NetworkFailure[] })._e2eNetworkFailures ?? [])
  },

  // authedPage: reuses saved session state if available; otherwise logs in via UI
  authedPage: async ({}, use) => {
    const { browser } = await createBrowser()

    let context: BrowserContext

    if (fs.existsSync(AUTH_STATE_FILE)) {
      context = await browser.newContext({
        storageState: AUTH_STATE_FILE,
        ignoreHTTPSErrors: true,
      })
    } else {
      context = await browser.newContext({ ignoreHTTPSErrors: true })
      const loginPage = await context.newPage()

      const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'
      await loginPage.goto(`${baseUrl}/auth/login`)

      const email = process.env.E2E_EMAIL ?? 'aweitsman@awproperties.com'
      const password = process.env.E2E_PASSWORD ?? 'password123'

      await loginPage.fill('input[autocomplete="email"]', email)
      await loginPage.fill('input[autocomplete="current-password"]', password)

      await Promise.all([
        loginPage.waitForURL(/\/(welcome|dashboard)/, { timeout: 30_000 }),
        loginPage.click('button[type=submit]'),
      ])

      // Save session so subsequent tests in this run skip the login form
      fs.mkdirSync(path.dirname(AUTH_STATE_FILE), { recursive: true })
      await context.storageState({ path: AUTH_STATE_FILE })
      await loginPage.close()
    }

    const page = await context.newPage()
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(`[console.error] ${msg.text()}`)
      }
    })
    page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`))

    ;(page as Page & { _e2eErrors: string[] })._e2eErrors = errors

    await use(page)
    await browser.close()
  },
})

export { expect }
