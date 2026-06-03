import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeChecklist,
  sanitizeNotes,
  MAX_CHECKLIST_ITEMS,
  MAX_LABEL_LENGTH,
  MAX_NOTES_LENGTH,
} from './guest-report.ts'

test('sanitizeChecklist returns [] for non-array input', () => {
  assert.deepEqual(sanitizeChecklist(undefined), [])
  assert.deepEqual(sanitizeChecklist(null), [])
  assert.deepEqual(sanitizeChecklist('nope'), [])
  assert.deepEqual(sanitizeChecklist({ label: 'x' }), [])
})

test('sanitizeChecklist coerces checked to a boolean and keeps valid labels', () => {
  assert.deepEqual(
    sanitizeChecklist([
      { label: 'Clean', checked: 'yes' },
      { label: 'Towels', checked: 0 },
    ]),
    [
      { label: 'Clean', checked: true },
      { label: 'Towels', checked: false },
    ]
  )
})

test('sanitizeChecklist drops entries without a usable label', () => {
  const out = sanitizeChecklist([
    { label: '', checked: true },
    { label: '   ', checked: true },
    { checked: true },
    { label: 42, checked: true },
    { label: 'Keep me', checked: true },
  ])
  assert.deepEqual(out, [{ label: 'Keep me', checked: true }])
})

test('sanitizeChecklist caps item count and label length', () => {
  const many = Array.from({ length: MAX_CHECKLIST_ITEMS + 50 }, (_, i) => ({
    label: `item ${i}`,
    checked: false,
  }))
  assert.equal(sanitizeChecklist(many).length, MAX_CHECKLIST_ITEMS)

  const [item] = sanitizeChecklist([{ label: 'x'.repeat(MAX_LABEL_LENGTH + 100), checked: true }])
  assert.equal(item.label.length, MAX_LABEL_LENGTH)
})

test('sanitizeChecklist tolerates null/garbage array entries', () => {
  assert.deepEqual(sanitizeChecklist([null, undefined, 5, { label: 'ok', checked: true }]), [
    { label: 'ok', checked: true },
  ])
})

test('sanitizeNotes truncates strings and rejects non-strings', () => {
  assert.equal(sanitizeNotes('hello'), 'hello')
  assert.equal(sanitizeNotes('a'.repeat(MAX_NOTES_LENGTH + 100))?.length, MAX_NOTES_LENGTH)
  assert.equal(sanitizeNotes(undefined), undefined)
  assert.equal(sanitizeNotes(123), undefined)
})
