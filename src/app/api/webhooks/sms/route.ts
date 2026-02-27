import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAiSms } from '@/lib/sms/ai-handler'
import { sendNewTicketEmail } from '@/lib/email/resend'

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? ''
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? ''

// -------------------------------------------------------
// Validate that the request genuinely came from Twilio
// -------------------------------------------------------
function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!AUTH_TOKEN) return false
  const sortedKeys = Object.keys(params).sort()
  let toSign = url
  for (const key of sortedKeys) {
    toSign += key + (params[key] ?? '')
  }
  const expected = crypto.createHmac('sha1', AUTH_TOKEN).update(toSign).digest('base64')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// -------------------------------------------------------
// Reply to Twilio with TwiML
// -------------------------------------------------------
function twiml(message: string): NextResponse {
  // Escape XML special chars so TwiML is valid
  const safe = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const body = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

// -------------------------------------------------------
// POST handler — called by Twilio on every inbound SMS
// -------------------------------------------------------
export async function POST(req: NextRequest) {
  const raw = await req.text()
  const params = Object.fromEntries(new URLSearchParams(raw).entries())

  const from: string = params['From'] ?? ''
  const body: string = params['Body']?.trim() ?? ''

  // Validate Twilio signature (skip in dev if no token set)
  if (AUTH_TOKEN) {
    const signature = req.headers.get('x-twilio-signature') ?? ''
    // Build the candidate URLs: Twilio signs using the exact URL it posted to.
    // Try both the configured app URL and the actual request host to handle
    // domain renames / multiple Vercel deployments.
    const proto = req.headers.get('x-forwarded-proto') ?? 'https'
    const host  = req.headers.get('host') ?? ''
    const actualUrl   = `${proto}://${host}/api/webhooks/sms`
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sms`
      : actualUrl

    const validSignature =
      validateTwilioSignature(signature, configuredUrl, params) ||
      validateTwilioSignature(signature, actualUrl, params)

    if (!validSignature) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  if (!from || !body) {
    return twiml('Could not read your message. Please try again.')
  }

  const supabase = createServiceClient()

  // Look up sender by phone number — only registered users can use SMS AI
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('phone_number', from)
    .maybeSingle()

  if (!profile) {
    return twiml(
      'Your number is not registered. Sign up at smartsumai.com and add your phone number during registration.'
    )
  }

  // Save inbound SMS to conversation history (fire-and-forget)
  // Note: PostgrestFilterBuilder has .then() but not .catch() — use .then(ok, err) form
  supabase.from('conversations').insert({ user_id: profile.id, role: 'user', content: body, channel: 'sms' }).then(undefined, () => {})

  // Quick HELP shortcut
  if (/^(help|\/help|\/start|hi|hello|hey)$/i.test(body)) {
    return twiml(
      `Hi ${profile.full_name?.split(' ')[0] ?? 'there'}! I'm your Smart Sumai AI. I can:\n\n` +
      `• Check property status\n` +
      `• Create service tickets\n` +
      `• Schedule guest stays\n` +
      `• Add contacts\n\n` +
      `Just text me naturally! e.g. "Leaking faucet at Lake Cabin, urgent"`
    )
  }

  // Route to AI handler
  const action = await handleAiSms({
    userId: profile.id,
    userName: profile.full_name ?? 'User',
    message: body,
  })

  // Save AI reply to conversation history (fire-and-forget)
  supabase.from('conversations').insert({ user_id: profile.id, role: 'assistant', content: action.reply, channel: 'sms' }).then(undefined, () => {})
  // Track token usage
  supabase.from('ai_usage').insert({ user_id: profile.id, feature: 'sms', tokens_in: Math.ceil(body.length / 4), tokens_out: Math.ceil(action.reply.length / 4) }).then(undefined, () => {})

  // Execute the action
  try {
    switch (action.type) {
      case 'create_ticket': {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .eq('owner_id', profile.id)
          .ilike('name', `%${action.property_name}%`)
          .limit(1)

        if (!properties?.length) {
          return twiml(`Property not found: ${action.property_name}. Check the name and try again.`)
        }
        const property = properties[0]

        const { data: ticket, error } = await supabase
          .from('service_requests')
          .insert({
            property_id: property.id,
            title: action.title,
            category: action.category ?? 'other',
            priority: action.priority,
            status: 'open',
            created_by: profile.id,
          })
          .select('id')
          .single()

        if (error || !ticket) {
          return twiml(`Failed to create ticket: ${error?.message ?? 'unknown error'}`)
        }

        await supabase.from('audit_log').insert({
          entity_type: 'service_request',
          entity_id: ticket.id,
          action: 'created',
          changed_by: profile.id,
          after_data: { title: action.title, property_id: property.id, source: 'sms_ai' },
        })

        // Notify relevant contact for this category
        const categoryToRole: Record<string, string> = {
          plumbing: 'plumbing', electrical: 'electrical', hvac: 'hvac',
          cleaning: 'cleaning', landscaping: 'landscaping', maintenance: 'maintenance',
        }
        const contactRole = categoryToRole[action.category] ?? 'maintenance'
        const { data: contact } = await supabase
          .from('property_contacts')
          .select('name, email, phone')
          .eq('property_id', property.id)
          .eq('role', contactRole)
          .maybeSingle()

        await sendNewTicketEmail({
          ticketId: ticket.id,
          title: action.title,
          propertyName: property.name,
          category: action.category ?? 'other',
          priority: action.priority,
        }).catch(console.error)

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
        let reply = action.reply || `✓ Ticket created: ${action.title}\nProperty: ${property.name} | Priority: ${action.priority}`
        if (contact) {
          reply += `\nNotified: ${contact.name}`
        } else {
          reply += `\nNo ${contactRole} contact on file for this property.`
        }
        reply += `\n${appUrl}/work-orders/${ticket.id}`
        return twiml(reply)
      }

      case 'create_stay': {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .eq('owner_id', profile.id)
          .ilike('name', `%${action.property_name}%`)
          .limit(1)

        if (!properties?.length) {
          return twiml(`Property not found: ${action.property_name}.`)
        }
        const property = properties[0]

        const { data: stay, error } = await supabase
          .from('stays')
          .insert({
            property_id: property.id,
            guest_name: action.guest_name,
            start_date: action.start_date,
            end_date: action.end_date,
            created_by: profile.id,
          })
          .select('id, guest_link_token')
          .single()

        if (error || !stay) {
          return twiml(`Failed to create stay: ${error?.message ?? 'unknown error'}`)
        }

        await supabase.from('audit_log').insert({
          entity_type: 'stay',
          entity_id: stay.id,
          action: 'created',
          changed_by: profile.id,
          after_data: { guest_name: action.guest_name, property_id: property.id, source: 'sms_ai' },
        })

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
        const guestLink = `${appUrl}/guest/${stay.guest_link_token}`
        const reply = action.reply || `✓ Stay created for ${action.guest_name}\nProperty: ${property.name}\n${action.start_date} → ${action.end_date}`
        return twiml(`${reply}\nGuest link: ${guestLink}`)
      }

      case 'update_status': {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .eq('owner_id', profile.id)
          .ilike('name', `%${action.property_name}%`)
          .limit(1)

        if (!properties?.length) {
          return twiml(`Property not found: ${action.property_name}.`)
        }
        const property = properties[0]

        const { error } = await supabase
          .from('property_status')
          .upsert({
            property_id: property.id,
            status: action.status,
            occupancy: 'unoccupied',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'property_id' })

        if (error) {
          return twiml(`Error updating status: ${error.message}`)
        }

        await supabase.from('audit_log').insert({
          entity_type: 'property_status',
          entity_id: property.id,
          action: 'updated',
          changed_by: profile.id,
          after_data: { status: action.status, source: 'sms_ai' },
        })

        return twiml(action.reply || `✓ ${property.name} → ${action.status.replace(/_/g, ' ')}`)
      }

      case 'create_contact': {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .eq('owner_id', profile.id)
          .ilike('name', `%${action.property_name}%`)
          .limit(1)

        if (!properties?.length) {
          return twiml(`Property not found: ${action.property_name}.`)
        }
        const property = properties[0]

        const { error } = await supabase
          .from('property_contacts')
          .insert({
            property_id: property.id,
            name: action.name,
            role: action.role,
            phone: action.phone ?? null,
            email: action.email ?? null,
            notes: action.notes ?? null,
            is_primary: false,
          })

        if (error) {
          return twiml(`Failed to add contact: ${error.message}`)
        }

        return twiml(action.reply || `✓ Added ${action.name} (${action.role}) to ${property.name}`)
      }

      case 'reply':
      case 'error':
      default:
        return twiml(action.reply || 'Something went wrong. Please try again.')
    }
  } catch (err) {
    console.error('[SMS webhook execution error]', err)
    return twiml('An unexpected error occurred. Please try again or text HELP.')
  }
}
