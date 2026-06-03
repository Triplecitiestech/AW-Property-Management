import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isNextControlFlowError } from './server-action-utils.ts'

test('recognizes the Next redirect/notFound control-flow errors', () => {
  assert.equal(isNextControlFlowError(new Error('NEXT_REDIRECT')), true)
  assert.equal(isNextControlFlowError(new Error('NEXT_NOT_FOUND')), true)
})

test('does not treat ordinary errors as control flow', () => {
  assert.equal(isNextControlFlowError(new Error('database exploded')), false)
  assert.equal(isNextControlFlowError('NEXT_REDIRECT'), false)
  assert.equal(isNextControlFlowError(null), false)
  assert.equal(isNextControlFlowError(undefined), false)
})
