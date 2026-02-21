import type { PropertyStatusEnum, TicketPriority } from '@/lib/supabase/types'

// ============================================================
// SMS Command Parser
// Supported formats (text these to the Twilio number):
//   status: [Property Name] | [status value]
//   ticket: [Property Name] | [title] | [priority?]
//   stay: [Property Name] | [Guest Name] | [YYYY-MM-DD] to [YYYY-MM-DD]
// ============================================================

export type ParsedCommand =
  | { type: 'status'; propertyName: string; status: PropertyStatusEnum; occupancy?: string }
  | { type: 'ticket'; propertyName: string; title: string; priority: TicketPriority; category?: string }
  | { type: 'stay'; propertyName: string; guestName: string; startDate: string; endDate: string }
  | { type: 'unknown'; raw: string }

const STATUS_MAP: Record<string, PropertyStatusEnum> = {
  clean: 'clean',
  'needs cleaning': 'needs_cleaning',
  'needs_cleaning': 'needs_cleaning',
  cleaning: 'needs_cleaning',
  'needs maintenance': 'needs_maintenance',
  'needs_maintenance': 'needs_maintenance',
  maintenance: 'needs_maintenance',
  'needs groceries': 'needs_groceries',
  'needs_groceries': 'needs_groceries',
  groceries: 'needs_groceries',
}

const PRIORITY_MAP: Record<string, TicketPriority> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent',
  critical: 'urgent',
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  if (/^tomorrow$/i.test(trimmed)) {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }
  if (/^today$/i.test(trimmed)) {
    return new Date().toISOString().split('T')[0]
  }
  const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

export function parseCommand(text: string): ParsedCommand {
  // Status command: "status: Property Name | clean"
  const statusMatch = text.match(/^(?:status|property)\s*:\s*(.+?)\s*\|\s*(.+?)(?:\s*\|\s*(.+))?$/i)
  if (statusMatch) {
    const propertyName = statusMatch[1].trim()
    const statusRaw = statusMatch[2].trim().toLowerCase()
    const status = STATUS_MAP[statusRaw]
    if (status) {
      return { type: 'status', propertyName, status }
    }
  }

  // Ticket command: "ticket: Property Name | title | priority"
  const ticketMatch = text.match(/^ticket\s*:\s*(.+?)\s*\|\s*(.+?)(?:\s*\|\s*(\w+))?$/i)
  if (ticketMatch) {
    const propertyName = ticketMatch[1].trim()
    const title = ticketMatch[2].trim()
    const priorityRaw = (ticketMatch[3] ?? 'medium').trim().toLowerCase()
    const priority = PRIORITY_MAP[priorityRaw] ?? 'medium'
    return { type: 'ticket', propertyName, title, priority }
  }

  // Natural language ticket: "Create maintenance ticket: sink leak at City Loft, high priority"
  const naturalTicketMatch = text.match(
    /^create\s+(?:(maintenance|cleaning|supplies)\s+)?ticket\s*:\s*(.+?)\s+at\s+(.+?)(?:,\s*(\w+)\s+priority)?$/i
  )
  if (naturalTicketMatch) {
    const category = (naturalTicketMatch[1] ?? 'other').toLowerCase()
    const title = naturalTicketMatch[2].trim()
    const propertyName = naturalTicketMatch[3].trim().replace(/,.*$/, '').trim()
    const priorityRaw = (naturalTicketMatch[4] ?? 'medium').toLowerCase()
    const priority = PRIORITY_MAP[priorityRaw] ?? 'medium'
    return { type: 'ticket', propertyName, title, priority, category }
  }

  // Stay command: "stay: Property Name | Guest Name | 2024-06-01 to 2024-06-07"
  const stayMatch = text.match(/^stay\s*:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s+to\s+(.+)$/i)
  if (stayMatch) {
    const propertyName = stayMatch[1].trim()
    const guestName = stayMatch[2].trim()
    const startDate = parseDate(stayMatch[3].trim())
    const endDate = parseDate(stayMatch[4].trim())
    if (startDate && endDate) {
      return { type: 'stay', propertyName, guestName, startDate, endDate }
    }
  }

  return { type: 'unknown', raw: text }
}

export function helpMessage(): string {
  return [
    'AW Property Management — SMS Commands',
    '',
    'Update property status:',
    '  status: Lake Cabin | needs cleaning',
    '  status: City Loft | clean',
    '',
    'Status values: clean, needs cleaning,',
    '  needs maintenance, needs groceries',
    '',
    'Create a ticket:',
    '  ticket: Lake Cabin | Sink is leaking | high',
    '  Create maintenance ticket: sink leak',
    '    at City Loft, high priority',
    '',
    'Create a stay:',
    '  stay: Mountain Retreat | Jordan Smith',
    '    | 2024-06-01 to 2024-06-07',
    '',
    'Text HELP to see this again.',
  ].join('\n')
}
