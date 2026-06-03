import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCommand, helpMessage } from './parser.ts'

const DATE = /^\d{4}-\d{2}-\d{2}$/

test('status command maps friendly values to enum values', () => {
  assert.deepEqual(parseCommand('status: Lake Cabin | needs cleaning'), {
    type: 'status',
    propertyName: 'Lake Cabin',
    status: 'needs_cleaning',
  })
  assert.deepEqual(parseCommand('status: City Loft | clean'), {
    type: 'status',
    propertyName: 'City Loft',
    status: 'clean',
  })
})

test('status command accepts the "property:" alias and shorthand synonyms', () => {
  assert.equal(parseCommand('property: Cabin | maintenance').type, 'status')
  const cmd = parseCommand('status: Cabin | groceries')
  assert.equal(cmd.type === 'status' && cmd.status, 'needs_groceries')
})

test('status command rejects unknown status values', () => {
  assert.equal(parseCommand('status: Cabin | sparkling').type, 'unknown')
})

test('ticket command parses title and priority, defaulting priority to medium', () => {
  assert.deepEqual(parseCommand('ticket: Lake Cabin | Sink is leaking | high'), {
    type: 'ticket',
    propertyName: 'Lake Cabin',
    title: 'Sink is leaking',
    priority: 'high',
  })
  const noPriority = parseCommand('ticket: Lake Cabin | Sink is leaking')
  assert.equal(noPriority.type === 'ticket' && noPriority.priority, 'medium')
})

test('ticket command maps "critical" to urgent', () => {
  const cmd = parseCommand('ticket: Cabin | Gas smell | critical')
  assert.equal(cmd.type === 'ticket' && cmd.priority, 'urgent')
})

test('natural-language ticket extracts category, title, property, and priority', () => {
  assert.deepEqual(
    parseCommand('Create maintenance ticket: sink leak at City Loft, high priority'),
    { type: 'ticket', category: 'maintenance', title: 'sink leak', propertyName: 'City Loft', priority: 'high' }
  )
})

test('stay command parses ISO dates', () => {
  assert.deepEqual(parseCommand('stay: Mountain Retreat | Jordan Smith | 2024-06-01 to 2024-06-07'), {
    type: 'stay',
    propertyName: 'Mountain Retreat',
    guestName: 'Jordan Smith',
    startDate: '2024-06-01',
    endDate: '2024-06-07',
  })
})

test('stay command understands relative + US-format dates', () => {
  const cmd = parseCommand('stay: Cabin | The Johnsons | today to 06/10/2024')
  assert.equal(cmd.type, 'stay')
  if (cmd.type === 'stay') {
    assert.match(cmd.startDate, DATE)
    assert.equal(cmd.endDate, '2024-06-10')
  }
})

test('stay command is unknown when a date cannot be parsed', () => {
  assert.equal(parseCommand('stay: Cabin | Guest | someday to whenever').type, 'unknown')
})

test('unrecognized input is unknown and preserves the raw text', () => {
  assert.deepEqual(parseCommand('hello there'), { type: 'unknown', raw: 'hello there' })
})

test('helpMessage lists the available commands', () => {
  const msg = helpMessage()
  assert.match(msg, /status:/)
  assert.match(msg, /ticket:/)
  assert.match(msg, /stay:/)
})
