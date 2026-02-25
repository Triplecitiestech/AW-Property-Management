/**
 * AI-powered SMS handler using Claude.
 * Replaces the rigid command parser with natural language understanding.
 * Claude receives full property context and returns structured JSON actions.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AiSmsAction =
  | { type: 'reply'; reply: string }
  | { type: 'create_ticket'; reply: string; property_name: string; title: string; priority: 'low' | 'medium' | 'high' | 'urgent'; category: string }
  | { type: 'create_stay'; reply: string; property_name: string; guest_name: string; start_date: string; end_date: string }
  | { type: 'update_status'; reply: string; property_name: string; status: 'clean' | 'needs_cleaning' | 'needs_maintenance' | 'needs_groceries' }
  | { type: 'create_contact'; reply: string; property_name: string; name: string; role: string; phone?: string; email?: string; notes?: string }
  | { type: 'error'; reply: string }

// ─── Context Builder ──────────────────────────────────────────────────────────

async function buildContext(userId: string) {
  const svc = createServiceClient()

  // Get user's properties with status
  const { data: properties } = await svc
    .from('properties')
    .select('id, name, address, property_status(status, occupancy)')
    .eq('owner_id', userId)

  const propertyIds: string[] = (properties ?? []).map((p: { id: string }) => p.id)

  // Get open tickets
  const { data: tickets } = await svc
    .from('service_requests')
    .select('id, title, priority, status, category, properties(name)')
    .eq('status', 'open')
    .in('property_id', propertyIds)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get upcoming/active stays
  const today = new Date().toISOString().split('T')[0]
  const { data: stays } = await svc
    .from('stays')
    .select('id, guest_name, start_date, end_date, properties(name)')
    .in('property_id', propertyIds)
    .gte('end_date', today)
    .order('start_date')
    .limit(10)

  // Get contacts per property
  const { data: contacts } = await svc
    .from('property_contacts')
    .select('name, role, phone, email, properties(name)')
    .in('property_id', propertyIds)

  return { properties: properties ?? [], tickets: tickets ?? [], stays: stays ?? [], contacts: contacts ?? [] }
}

function formatContext(ctx: Awaited<ReturnType<typeof buildContext>>): string {
  const lines: string[] = []

  lines.push('=== PROPERTIES ===')
  if (ctx.properties.length === 0) {
    lines.push('No properties yet.')
  } else {
    for (const p of ctx.properties) {
      const ps = Array.isArray(p.property_status) ? p.property_status[0] : p.property_status
      lines.push(`• ${p.name}${p.address ? ` (${p.address})` : ''} — Status: ${ps?.status ?? 'unknown'}, Occupancy: ${ps?.occupancy ?? 'unknown'}`)
    }
  }

  lines.push('\n=== OPEN TICKETS ===')
  if (ctx.tickets.length === 0) {
    lines.push('No open tickets.')
  } else {
    for (const t of ctx.tickets) {
      const prop = (t.properties as { name: string } | null)?.name ?? 'unknown'
      lines.push(`• [${t.priority.toUpperCase()}] ${t.title} — ${prop} (${t.category})`)
    }
  }

  lines.push('\n=== UPCOMING STAYS ===')
  if (ctx.stays.length === 0) {
    lines.push('No upcoming stays.')
  } else {
    for (const s of ctx.stays) {
      const prop = (s.properties as { name: string } | null)?.name ?? 'unknown'
      lines.push(`• ${s.guest_name} at ${prop}: ${s.start_date} → ${s.end_date}`)
    }
  }

  lines.push('\n=== CONTACTS ===')
  if (ctx.contacts.length === 0) {
    lines.push('No contacts yet.')
  } else {
    for (const c of ctx.contacts) {
      const prop = (c.properties as { name: string } | null)?.name ?? 'unknown'
      lines.push(`• ${c.name} (${c.role}) at ${prop}${c.phone ? ` — ${c.phone}` : ''}`)
    }
  }

  return lines.join('\n')
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(userName: string, contextText: string): string {
  return `You are the Smart Sumai AI Property Manager — an SMS assistant helping ${userName} manage their short-term rental properties.

You communicate via SMS, so keep replies concise (ideally under 320 characters). Be friendly, practical, and direct.

${contextText}

=== YOUR CAPABILITIES ===
- Answer questions about property status, tickets, stays, and contacts
- Create service/maintenance tickets for properties
- Schedule guest stays at properties
- Update property cleaning/maintenance status
- Add new contacts (cleaners, plumbers, landscapers, etc.) to properties
- Notify the right contact when a service issue is reported

=== RESPONSE FORMAT ===
Always respond with valid JSON only (no markdown, no code blocks):

For a simple reply or info query:
{"type":"reply","reply":"Your SMS message here"}

For creating a ticket:
{"type":"create_ticket","reply":"Confirmation message","property_name":"exact property name","title":"ticket title","priority":"low|medium|high|urgent","category":"plumbing|electrical|hvac|cleaning|maintenance|landscaping|other"}

For scheduling a stay:
{"type":"create_stay","reply":"Confirmation message","property_name":"exact property name","guest_name":"Guest Full Name","start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD"}

For updating property status:
{"type":"update_status","reply":"Confirmation message","property_name":"exact property name","status":"clean|needs_cleaning|needs_maintenance|needs_groceries"}

For adding a contact:
{"type":"create_contact","reply":"Confirmation message","property_name":"exact property name","name":"Contact Name","role":"primary|cleaning|maintenance|plumbing|hvac|electrical|landscaping|groceries|other","phone":"optional","email":"optional","notes":"optional"}

=== RULES ===
- Use property names that closely match what's in the PROPERTIES list above
- Dates must be YYYY-MM-DD format. Today is ${new Date().toISOString().split('T')[0]}
- If a request is unclear, ask for clarification in the reply
- If a property doesn't exist, say so and list available properties
- Keep SMS replies short and conversational`
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function handleAiSms(params: {
  userId: string
  userName: string
  message: string
}): Promise<AiSmsAction> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      type: 'error',
      reply: 'AI is not configured. Please contact support@smartsumai.com.',
    }
  }

  try {
    const ctx = await buildContext(params.userId)
    const contextText = formatContext(ctx)
    const systemPrompt = buildSystemPrompt(params.userName, contextText)

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: params.message }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const parsed = JSON.parse(cleaned) as AiSmsAction
    return parsed
  } catch (err) {
    console.error('[AI SMS handler error]', err)
    return {
      type: 'error',
      reply: 'Sorry, I had trouble understanding that. Try texting HELP for command examples.',
    }
  }
}
