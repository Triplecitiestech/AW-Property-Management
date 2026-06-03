import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isAdminEmail, getAdminEmails } from './admin.ts'

test('isAdminEmail matches the ADMIN_EMAILS allowlist case-insensitively', () => {
  process.env.ADMIN_EMAILS = 'Owner@Example.com, manager@example.com'
  assert.equal(isAdminEmail('owner@example.com'), true)
  assert.equal(isAdminEmail('OWNER@EXAMPLE.COM'), true)
  assert.equal(isAdminEmail('manager@example.com'), true)
  assert.equal(isAdminEmail('stranger@example.com'), false)
  assert.equal(isAdminEmail(null), false)
  assert.equal(isAdminEmail(undefined), false)
  assert.equal(isAdminEmail(''), false)
})

test('getAdminEmails returns [] when unset', () => {
  delete process.env.ADMIN_EMAILS
  assert.deepEqual(getAdminEmails(), [])
  assert.equal(isAdminEmail('anyone@example.com'), false)
})
