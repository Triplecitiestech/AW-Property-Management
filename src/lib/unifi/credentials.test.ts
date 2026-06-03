import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generatePin, isValidPin, generateWifiPassword } from './credentials.ts'

test('generatePin returns a zero-padded numeric string of the requested length', () => {
  for (let i = 0; i < 200; i++) {
    const pin = generatePin()
    assert.match(pin, /^\d{6}$/)
  }
  assert.match(generatePin(4), /^\d{4}$/)
})

test('isValidPin validates length and digits', () => {
  assert.equal(isValidPin('012345'), true)
  assert.equal(isValidPin('12345'), false) // too short
  assert.equal(isValidPin('12345a'), false) // non-digit
  assert.equal(isValidPin('1234', 4), true)
})

test('generateWifiPassword produces a readable Word-Word-#### pattern', () => {
  for (let i = 0; i < 200; i++) {
    assert.match(generateWifiPassword(), /^[A-Z][a-z]+-[A-Z][a-z]+-\d{4}$/)
  }
})

test('generatePin has reasonable spread (not constant)', () => {
  const seen = new Set<string>()
  for (let i = 0; i < 50; i++) seen.add(generatePin())
  assert.ok(seen.size > 25, `expected variety, got ${seen.size} unique of 50`)
})
