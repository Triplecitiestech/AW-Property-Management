/**
 * Reusable structured confirmation builder.
 * All action confirmations (work orders, stays, contacts, status updates)
 * must use this to produce consistent, structured responses.
 *
 * RULE: Every confirmation must include both property name AND full address.
 */

import { BRAND_AI_NAME, BASE_URL } from '@/lib/branding'

export interface WorkOrderConfirmation {
  workOrderNumber?: string
  workOrderId?: string
  title: string
  propertyName: string
  propertyAddress?: string | null
  category: string
  priority: string
  assignedTo?: string | null
  detail?: string
}

export interface StayConfirmation {
  guestName: string
  propertyName: string
  propertyAddress?: string | null
  startDate: string
  endDate: string
  guestLinkToken?: string
}

export interface ContactConfirmation {
  name: string
  role: string
  propertyName: string
  propertyAddress?: string | null
  phone?: string | null
  email?: string | null
}

export interface StatusConfirmation {
  propertyName: string
  propertyAddress?: string | null
  status: string
}

export function buildWorkOrderConfirmation(c: WorkOrderConfirmation): string {
  const lines = [
    'Work Order Created',
    '',
    c.workOrderNumber ? `Work Order: #${c.workOrderNumber}` : null,
    `Property: ${c.propertyName}`,
    c.propertyAddress ? `Address: ${c.propertyAddress}` : null,
    `Category: ${capitalize(c.category)}`,
    `Priority: ${capitalize(c.priority)}`,
    `Title: ${c.title}`,
    `Status: Open`,
    c.assignedTo ? `Assigned To: ${c.assignedTo}` : null,
    '',
    c.detail ? `Summary: ${c.detail}` : null,
    c.workOrderId ? `Track progress: ${BASE_URL}/work-orders/${c.workOrderId}` : null,
  ]
  return lines.filter(l => l !== null).join('\n')
}

export function buildStayConfirmation(c: StayConfirmation): string {
  const lines = [
    'Stay Scheduled',
    '',
    `Property: ${c.propertyName}`,
    c.propertyAddress ? `Address: ${c.propertyAddress}` : null,
    `Guest: ${c.guestName}`,
    `Check-in: ${c.startDate}`,
    `Check-out: ${c.endDate}`,
    '',
    c.guestLinkToken ? `Guest welcome page: ${BASE_URL}/guest/${c.guestLinkToken}` : null,
  ]
  return lines.filter(l => l !== null).join('\n')
}

export function buildContactConfirmation(c: ContactConfirmation): string {
  const lines = [
    'Contact Added',
    '',
    `Property: ${c.propertyName}`,
    c.propertyAddress ? `Address: ${c.propertyAddress}` : null,
    `Name: ${c.name}`,
    `Role: ${capitalize(c.role)}`,
    c.phone ? `Phone: ${c.phone}` : null,
    c.email ? `Email: ${c.email}` : null,
  ]
  return lines.filter(l => l !== null).join('\n')
}

export function buildStatusConfirmation(c: StatusConfirmation): string {
  return [
    'Property Status Updated',
    '',
    `Property: ${c.propertyName}`,
    c.propertyAddress ? `Address: ${c.propertyAddress}` : null,
    `New Status: ${c.status.replace(/_/g, ' ')}`,
  ].filter(l => l !== null).join('\n')
}

export function buildErrorMessage(actionReply: string, detail: string): string {
  return `${actionReply}\n\nCould not complete: ${detail}\n\nSource: ${BRAND_AI_NAME}`
}

function capitalize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
