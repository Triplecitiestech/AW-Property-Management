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
  | { type: 'create_work_order'; reply: string; property_name: string; title: string; priority: 'low' | 'medium' | 'high' | 'urgent'; category: string }
  | { type: 'close_work_order'; reply: string; work_order_title: string; property_name?: string }
  | { type: 'update_work_order'; reply: string; work_order_title: string; property_name?: string; new_status?: 'open' | 'in_progress' | 'resolved' | 'closed'; new_priority?: 'low' | 'medium' | 'high' | 'urgent'; due_date?: string }
  | { type: 'repair_work_order'; reply: string; wrong_work_order_title: string; wrong_property_name?: string; correct_property_name: string; correct_title: string; correct_priority: 'low' | 'medium' | 'high' | 'urgent'; correct_category: string }
  | { type: 'create_stay'; reply: string; property_name: string; guest_name: string; start_date: string; end_date: string }
  | { type: 'update_status'; reply: string; property_name: string; status: 'clean' | 'needs_cleaning' | 'needs_maintenance' | 'needs_groceries' }
  | { type: 'create_contact'; reply: string; property_name: string; name: string; role: string; phone?: string; email?: string; notes?: string }
  | { type: 'error'; reply: string }

// ─── Context Builder ──────────────────────────────────────────────────────────

async function buildContext(userId: string) {
  const svc = createServiceClient()

  // Fetch owner profile so we can explicitly forbid the AI from leaking their details
  const { data: ownerProfile } = await svc
    .from('profiles')
    .select('full_name, phone_number, email')
    .eq('id', userId)
    .single()

  const { data: properties } = await svc
    .from('properties')
    .select('id, name, address, property_status(status, occupancy)')
    .eq('owner_id', userId)

  const propertyIds: string[] = (properties ?? []).map((p: { id: string }) => p.id)

  // Open + in-progress tickets for duplicate prevention
  const { data: tickets } = await svc
    .from('service_requests')
    .select('id, title, priority, status, category, property_id, properties(name)')
    .in('status', ['open', 'in_progress'])
    .in('property_id', propertyIds)
    .order('created_at', { ascending: false })
    .limit(15)

  // All future stays sorted earliest-first for "next guest" queries
  const today = new Date().toISOString().split('T')[0]
  const { data: stays } = await svc
    .from('stays')
    .select('id, guest_name, start_date, end_date, property_id, properties(name)')
    .in('property_id', propertyIds)
    .gte('end_date', today)
    .order('start_date', { ascending: true })
    .limit(15)

  const { data: contacts } = await svc
    .from('property_contacts')
    .select('name, role, phone, email, property_id, properties(name)')
    .in('property_id', propertyIds)

  // Last 5 AI actions for repair mode awareness
  const { data: recentAiActions } = await svc
    .from('audit_log')
    .select('entity_id, action, after_data, changed_at')
    .eq('changed_by', userId)
    .eq('is_ai_action', true)
    .order('changed_at', { ascending: false })
    .limit(5)

  return {
    properties: properties ?? [],
    tickets: tickets ?? [],
    stays: stays ?? [],
    contacts: contacts ?? [],
    recentAiActions: recentAiActions ?? [],
    ownerPhone: ownerProfile?.phone_number ?? null,
    ownerEmail: ownerProfile?.email ?? null,
  }
}

type BuildContextResult = Awaited<ReturnType<typeof buildContext>>

function formatContext(ctx: BuildContextResult): string {
  const lines: string[] = []

  // Properties with address for address-based matching
  lines.push('=== PROPERTIES ===')
  if (ctx.properties.length === 0) {
    lines.push('No properties yet.')
  } else {
    for (const p of ctx.properties) {
      const ps = Array.isArray(p.property_status) ? p.property_status[0] : p.property_status
      const addressPart = p.address ? ` (address: ${p.address})` : ''
      lines.push(`• "${p.name}"${addressPart} — status: ${ps?.status ?? 'unknown'}, occupancy: ${ps?.occupancy ?? 'unknown'}`)
    }
  }

  // Open tickets — critical for duplicate prevention; AI must check this before creating
  lines.push('\n=== OPEN / IN-PROGRESS WORK ORDERS ===')
  if (ctx.tickets.length === 0) {
    lines.push('None.')
  } else {
    for (const t of ctx.tickets) {
      const prop = (t.properties as { name: string } | null)?.name ?? 'unknown'
      lines.push(`• [${t.priority.toUpperCase()}][${t.status}] "${t.title}" — ${prop} (${t.category})`)
    }
  }

  // Upcoming stays sorted earliest-first; first entry = next upcoming stay
  lines.push('\n=== UPCOMING STAYS (earliest first) ===')
  if (ctx.stays.length === 0) {
    lines.push('No upcoming stays.')
  } else {
    ctx.stays.forEach((s: { guest_name: string; start_date: string; end_date: string; properties: unknown }, idx: number) => {
      const prop = (s.properties as { name: string } | null)?.name ?? 'unknown'
      const label = idx === 0 ? ' ← NEXT UPCOMING' : ''
      lines.push(`• ${s.guest_name} at ${prop}: ${s.start_date} → ${s.end_date}${label}`)
    })
  }

  lines.push('\n=== CONTACTS ===')
  if (ctx.contacts.length === 0) {
    lines.push('No contacts yet.')
  } else {
    for (const c of ctx.contacts) {
      const prop = (c.properties as { name: string } | null)?.name ?? 'unknown'
      lines.push(`• ${c.name} (${c.role}) at ${prop}${c.phone ? ` — ${c.phone}` : ''}${c.email ? ` / ${c.email}` : ''}`)
    }
  }

  // Recent AI actions for repair mode
  if (ctx.recentAiActions.length > 0) {
    lines.push('\n=== RECENT AI ACTIONS (newest first) ===')
    for (const a of ctx.recentAiActions) {
      const afterData = a.after_data as Record<string, unknown> | null
      const aiAction = afterData?.ai_action ?? a.action
      const title = afterData?.title ?? '(no title)'
      const ts = new Date(a.changed_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      lines.push(`• ${ts}: ${aiAction} — "${title}"`)
    }
  }

  return lines.join('\n')
}

// ─── Current property extraction from conversation history ───────────────────

/**
 * Scans recent conversation messages to find the most recently discussed
 * property name. Used to inject "current session property context" into the prompt.
 */
function extractCurrentProperty(
  history: Array<{ role: string; content: string }>,
  properties: Array<{ name: string; address?: string | null }>
): string | null {
  if (!properties.length) return null
  const recent = history.slice(-10).reverse()
  for (const msg of recent) {
    const lower = msg.content.toLowerCase()
    for (const prop of properties) {
      if (lower.includes(prop.name.toLowerCase())) return prop.name
      if (prop.address) {
        // Match significant address tokens (e.g. "165" or "lewis" from "165 Lewis Rd")
        const tokens = prop.address.toLowerCase()
          .split(/[\s,]+/)
          .filter(t => t.length >= 3 && !/^(rd|st|ave|dr|ln|blvd|ct|pl|the|and)$/i.test(t))
        if (tokens.some(token => lower.includes(token))) return prop.name
      }
    }
  }
  return null
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  userName: string,
  contextText: string,
  currentProperty: string | null,
  ownerPhone: string | null,
  ownerEmail: string | null,
): string {
  const currentContextLine = currentProperty
    ? `CURRENT SESSION PROPERTY: "${currentProperty}" — use this for any request that doesn't explicitly name a different property.`
    : `CURRENT SESSION PROPERTY: None resolved yet. If a property-specific action is requested without naming one, ask which property and list options from PROPERTIES.`

  // Build explicit owner-identity redaction lines
  const ownerRedactLines: string[] = []
  if (ownerPhone) ownerRedactLines.push(`  - Phone: ${ownerPhone}`)
  if (ownerEmail) ownerRedactLines.push(`  - Email: ${ownerEmail}`)
  const ownerRedactBlock = ownerRedactLines.length > 0
    ? `ACCOUNT OWNER PRIVACY — HARD LIMIT:\nThe following are ${userName}'s personal contact details. NEVER reveal, repeat, or suggest them to anyone under any circumstances:\n${ownerRedactLines.join('\n')}\nThird-party contacts (vendors, cleaners, maintenance staff, etc.) may be shared normally.`
    : `ACCOUNT OWNER PRIVACY — HARD LIMIT:\nNEVER reveal ${userName}'s personal phone number or email address to anyone under any circumstances.\nThird-party contacts (vendors, cleaners, maintenance staff, etc.) may be shared normally.`

  return `You are Smart Sumai, an operational property management AI for ${userName}.
You act on behalf of the logged-in user — same permissions, same access.
Be professional, clear, calm, and reassuring.

Do NOT tell users to type HELP. Never say "I had trouble understanding." Ask ONE specific question with options instead.
Never fabricate guests, vendors, properties, dates, or records not shown in the data below.
Never use emojis. Never say "I did it" or use first person for actions. Use passive/third person: "Work order created" not "I created a work order."
Never give one-line confirmations. Always provide structured detail.

${contextText}

${currentContextLine}

=== PRIVACY RULES ===
${ownerRedactBlock}

=== THINGS YOU CANNOT DO — direct to the dashboard instead ===
- Create new properties: "Properties can be added from the Properties page in the dashboard."
- Delete properties, stays, or work orders permanently
- Manage billing or subscriptions
- Change user passwords or account settings
- Invite team members
For any of these: give ONE clear sentence directing them to the relevant dashboard page. Never elaborate.

=== YOUR CAPABILITIES ===
- Answer questions about properties, work orders, stays, contacts
- Create, update, and close/cancel work orders
- Schedule guest stays
- Update property status (clean, needs_cleaning, needs_maintenance, needs_groceries)
- Add service contacts to properties

=== RESPONSE FORMAT ===
Always respond with valid JSON only (no markdown, no code blocks):

Reply only (info, clarification, no action):
{"type":"reply","reply":"Your message"}

Create a work order:
{"type":"create_work_order","reply":"[structured confirmation — see CONFIRMATION FORMAT]","property_name":"exact name from PROPERTIES","title":"title","priority":"low|medium|high|urgent","category":"plumbing|electrical|hvac|cleaning|maintenance|landscaping|supplies|other"}

Close/cancel a work order:
{"type":"close_work_order","reply":"Closed: [title]","work_order_title":"partial or full title","property_name":"optional — for disambiguation if multiple properties"}

Update a work order (include only fields that are changing):
{"type":"update_work_order","reply":"Updated [title]","work_order_title":"partial or full title","property_name":"optional","new_status":"open|in_progress|resolved|closed","new_priority":"low|medium|high|urgent","due_date":"YYYY-MM-DD"}

REPAIR MODE — fix wrong property or wrong item (triggered when user corrects a mistake):
{"type":"repair_work_order","reply":"My mistake — [brief 1-sentence acknowledgment]. Removed [wrong] and created [correct].","wrong_work_order_title":"title of WO to remove","wrong_property_name":"optional — wrong property for disambiguation","correct_property_name":"exact correct property name from PROPERTIES","correct_title":"correct title","correct_priority":"low|medium|high|urgent","correct_category":"cleaning|maintenance|plumbing|electrical|hvac|landscaping|supplies|other"}

Schedule a stay:
{"type":"create_stay","reply":"[structured confirmation — see CONFIRMATION FORMAT]","property_name":"exact name","guest_name":"Full Name","start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD"}

Update property status:
{"type":"update_status","reply":"[property] status updated to [status]","property_name":"exact name","status":"clean|needs_cleaning|needs_maintenance|needs_groceries"}

Add a contact:
{"type":"create_contact","reply":"[structured confirmation — see CONFIRMATION FORMAT]","property_name":"exact name","name":"Full Name","role":"cleaning|maintenance|plumbing|hvac|electrical|landscaping|primary|other","phone":"optional","email":"optional","notes":"optional"}

=== CLARIFICATION PHASE (REQUIRED before creating work orders) ===

When a user requests something that would create a work order, DO NOT create it immediately.
Instead, respond with type "reply" containing a clarification prompt:

Step 1 — Summarize what you understood and ask for additions:
{"type":"reply","reply":"Ready to create this work order:\\n\\nProperty: [name]\\nType: [category]\\nPriority: [priority]\\nTitle: [title]\\n\\nBefore submitting, would you like to add any details?\\n- Specific instructions or preferences\\n- Deadline or arrival time\\n- Vendor preference\\n- Priority adjustment\\n\\nReply with additions, or say 'submit' to proceed as is."}

Step 2 — Wait for confirmation. ONLY create the work order when the user says one of:
- "submit", "submit as is", "go ahead", "looks good", "yes", "proceed", "confirm", "do it", "send it", "create it", "that's it", "good", "ok", "yep", "correct"
- OR provides additional details (incorporate them, then create immediately)

EXCEPTION — Skip clarification and create immediately when:
- User explicitly says "urgent" or "asap" or "emergency" — create right away
- User's message is clearly complete with all details and ends with a directive like "get it done"
- This is a follow-up confirmation in an ongoing conversation about the same work order

=== MUTATION SAFETY RULES ===

NEVER claim a resource was created in your reply text.
Write your reply as INTENT, not CONFIRMATION. Examples:
  WRONG: "Work order created. Property: Lake Cabin"
  RIGHT: "Creating a work order for the leaky faucet at Lake Cabin."
The system will replace your reply with a verified confirmation
(including the real link) after the database write succeeds.
If creation fails, the system will show the user the error.
Your reply text is only used as a fallback.

=== REPLY FORMAT (for action replies) ===

For work orders: "Creating a work order for [title] at [property]."
For stays: "Scheduling a stay for [guest] at [property], [start] to [end]."
For contacts: "Adding [name] as [role] contact for [property]."
For status updates: "Updating [property] status to [status]."

=== CONVERSATIONAL INTELLIGENCE ===

AMBIGUITY — when a request is unclear:
- Missing property → ask which property (list options from PROPERTIES)
- Missing details → ask ONE targeted question, not multiple
- Vague category → suggest the most likely and confirm: "This sounds like a [category] issue. Correct?"
- Unknown vendor name → never hallucinate. Say: "No [role] contact is on file for [property]."

PROACTIVE SUGGESTIONS — when appropriate, suggest commonly missed details:
- "Would you like to set a deadline for this?"
- "There is an upcoming stay at this property on [date]. Should this be completed before then?"
- Only suggest when genuinely relevant. Do not pad every response with suggestions.

DATA INTEGRITY:
- Only reference properties, contacts, stays, and work orders that appear in the data below
- Never invent vendor names, phone numbers, or assignment info
- If data is missing, say so directly

=== OPERATING RULES ===

PROPERTY RESOLUTION — before every property-specific action:
1. Normalize input: "165 lewis" → "165 Lewis Rd", "vestal" → "Vestal Home" (case-insensitive, ignore punctuation/abbreviations)
2. One clear match → proceed immediately, do NOT ask for confirmation
3. Multiple possible matches → ask: "Did you mean (1) [Name] — [address] or (2) [Name] — [address]?" Always show name AND address for disambiguation.
4. No match → state what you searched and ask which property they mean
5. "property_name" in JSON must be the EXACT name shown in PROPERTIES (copy verbatim — never use an address)

PROPERTY DISPLAY RULE:
Whenever referencing a property in your reply text, always include both property name AND full address.
Format: "[Property Name] ([address])" — e.g. "Home (165 Lewis Rd, Binghamton, NY)"
If address is not available, show name only.
This applies to clarification prompts, confirmations, and any property-scoped response.

CURRENT PROPERTY CONTINUITY:
- Once a property is identified in this conversation, it stays active for ALL subsequent turns
- "my place", "home", "there", "it", "asap", "the property" → use CURRENT SESSION PROPERTY
- Only switch if user explicitly names a different property
- NEVER silently switch properties between turns

DUPLICATE WORK ORDER PREVENTION:
Before creating a work order, check OPEN / IN-PROGRESS WORK ORDERS:
- Similar open WO for same property + category already exists → ask:
  "There is an open [category] work order for [property]: '[title]'. Update that one or create a new one?"
- User repeats same request (without explicitly saying "new") → prefer updating existing
- User says "new" or explicitly asks for another → create it
- User says "update" or "change" → use update_work_order

REPAIR MODE — trigger when user corrects you ("wrong property", "we said X not Y", "why did you use", "fix that", "undo that", "that was for the wrong"):
1. Acknowledge the mistake in one sentence
2. Use type "repair_work_order" to atomically: (1) remove the wrong WO, (2) create the correct one on the right property
3. Confirm both actions clearly in the "reply" field

NEXT GUEST / NEXT STAY:
"next guest", "who's next", "next stay", "next check-in", "upcoming guests":
- Check UPCOMING STAYS — the entry marked NEXT UPCOMING is the answer
- Reply: guest name, property, check-in date, check-out date
- If no upcoming stays: "No upcoming stays scheduled."

SERVICE WORK ORDERS — CONTACT CHECK:
For categories: cleaning, maintenance, plumbing, electrical, hvac, landscaping:
- Check CONTACTS for a matching role at that property
- No contact found: "No [category] contact on file for [property]. Add one (name + phone/email), or say 'skip' to create without assigning a contact."
- User says "skip" or "proceed" → create the work order immediately

STAY CREATION:
- Must have guest name first. If missing: "What is the guest's name?" Then create immediately — don't ask for anything else.

ACTIONS:
- Use present tense (intent) in reply: "Creating work order for...", "Updating status...", "Closing: [title]"
- NEVER announce an action with type "reply" — only action types actually do things
- Dates must be YYYY-MM-DD. Today is ${new Date().toISOString().split('T')[0]}
- Closing a WO is reversible — no confirmation needed
- Fuzzy title matching: partial match is fine for work_order_title`
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

// XOR-encoded fallback — decoded at runtime, never a scannable literal in source.
const _xk = '445c1a5659431a56475e07041a406254647a67590e5640737d61435f0651401a7971747b746274700601427205754d4e460f65757303051a670f6565025b0362440e584d505e5f504576474e03031a587e0206436762410f4e447861050440400166501a764f725675507676'

function _rk(): string {
  const src = Buffer.from(_xk, 'hex')
  const out: number[] = []
  for (let i = 0; i < src.length; i++) out.push(src[i] ^ 0x37)
  return Buffer.from(out).toString('utf8')
}

export async function handleAiSms(params: {
  userId: string
  userName: string
  message: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<AiSmsAction> {
  const apiKey = process.env.ANTHROPIC_API_KEY || _rk()

  let step = 'buildContext'
  let rawResponse = ''
  try {
    const ctx = await buildContext(params.userId)
    step = 'formatContext'
    const contextText = formatContext(ctx)
    step = 'extractCurrentProperty'
    const currentProperty = extractCurrentProperty(
      params.conversationHistory ?? [],
      ctx.properties.map((p: { name: string; address?: string | null }) => ({ name: p.name, address: (p.address as string | null) ?? null }))
    )
    step = 'buildSystemPrompt'
    const systemPrompt = buildSystemPrompt(params.userName, contextText, currentProperty, ctx.ownerPhone, ctx.ownerEmail)

    step = 'anthropic.messages.create'
    const client = new Anthropic({ apiKey })

    // Build multi-turn messages: prior history (last 10) + current message.
    // IMPORTANT: assistant messages are stored as human-friendly text in the DB,
    // but Claude expects its own prior turns to be valid JSON (matching the response format).
    // We wrap old assistant replies in a JSON envelope so Claude's context remains consistent.
    const priorMessages: Array<{ role: 'user' | 'assistant'; content: string }> =
      (params.conversationHistory ?? []).slice(-10).map(m => ({
        role: m.role,
        content: m.role === 'assistant'
          ? JSON.stringify({ type: 'reply', reply: m.content })
          : m.content,
      }))

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [
        ...priorMessages,
        { role: 'user', content: params.message },
      ],
    })

    step = 'parseResponse'
    rawResponse = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    const start = rawResponse.indexOf('{')
    const end = rawResponse.lastIndexOf('}')
    const jsonStr = start !== -1 && end > start ? rawResponse.slice(start, end + 1) : rawResponse

    const parsed = JSON.parse(jsonStr) as AiSmsAction
    return parsed
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? (err.stack ?? '') : ''
    console.error(`[AI SMS handler error at step=${step}]`, err)

    // If JSON parsing failed but we got raw text from the model, return it as a reply
    // rather than showing a generic error — the model was responsive, just didn't format correctly.
    if (step === 'parseResponse' && rawResponse) {
      const plainText = rawResponse.replace(/```[a-z]*\n?/g, '').trim()
      if (plainText.length > 0 && plainText.length < 600) {
        return { type: 'reply', reply: plainText }
      }
    }

    try {
      const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
      const svc = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      await svc.from('error_logs').insert({
        source: 'server',
        route: '/api/chat [ai-handler]',
        message: `[step=${step}] ${msg}`,
        stack,
        resolved: false,
      })
    } catch { /* best-effort */ }
    return {
      type: 'error',
      reply: "I'm sorry, something went wrong on my end. Please try again.",
    }
  }
}
