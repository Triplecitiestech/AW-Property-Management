/**
 * Smoke tests — Phase 1.
 *
 * These 3 tests prove that the Browserbase E2E loop is wired up correctly:
 *   1. Landing page loads without JS console errors
 *   2. An unauthenticated visit to /dashboard redirects to /auth/login
 *   3. Logging in with the test account reaches /welcome
 *
 * If any of these fail in CI, the artifacts (screenshot + trace) are uploaded
 * as GitHub Actions artifacts for direct inspection.
 */

import { test, expect } from './fixtures'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

test.describe('Smoke', () => {

  test('homepage loads without console errors', async ({ page, consoleErrors }) => {
    const failedRequests: string[] = []
    page.on('requestfailed', req => failedRequests.push(`${req.method()} ${req.url()}`))

    const res = await page.goto(BASE + '/')
    expect(res?.status(), 'homepage should return 200').toBe(200)

    await page.waitForLoadState('networkidle')

    // No JS errors
    expect(
      consoleErrors,
      `Console errors on homepage:\n${consoleErrors.join('\n')}`
    ).toHaveLength(0)

    // Page must have visible content
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('unauthenticated /dashboard redirects to /auth/login', async ({ page }) => {
    await page.goto(BASE + '/dashboard')

    // Must end up on the login page
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15_000 })

    // Login form is visible
    await expect(page.locator('input[autocomplete="email"]')).toBeVisible()
  })

  test('sign-in with test account reaches /welcome', async ({ page }) => {
    await page.goto(BASE + '/auth/login')

    const email = process.env.E2E_EMAIL ?? 'aweitsman@awproperties.com'
    const password = process.env.E2E_PASSWORD ?? 'password123'

    await page.fill('input[autocomplete="email"]', email)
    await page.fill('input[autocomplete="current-password"]', password)

    await Promise.all([
      page.waitForURL(/\/(welcome|dashboard)/, { timeout: 30_000 }),
      page.click('button[type=submit]'),
    ])

    // Must have navigated away from the login page
    await expect(page).toHaveURL(/\/(welcome|dashboard)/)

    // No error message shown on the page
    const errorBanner = page.locator('[class*="red"]').filter({ hasText: /error|failed|wrong/i })
    await expect(errorBanner).not.toBeVisible()
  })

})
