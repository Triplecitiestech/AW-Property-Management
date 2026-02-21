import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { parseCommand, helpMessage } from '@/lib/sms/parser'
import { sendNewTicketEmail } from '@/lib/email/resend'

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? ''
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? ''

// -------------------------------------------------------
// Validate that the request genuinely came from Twilio
// https://www.twilio.com/docs/usage/webhooks/webhooks-security
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
  const body = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

// -------------------------------------------------------
// POST handler — called by Twilio on every inbound SMS
// -------------------------------------------------------
export async function POST(req: NextRequest) {
  // Parse URL-encoded Twilio body
  const raw = await req.text()
  const params = Object.fromEntries(new URLSearchParams(raw).entries())

  const from: string = params['From'] ?? ''
  const body: string = params['Body']?.trim() ?? ''

  // Validate Twilio signature (skip in dev if no token set)
  if (AUTH_TOKEN) {
    const signature = req.headers.get('x-twilio-signature') ?? ''
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const webhookUrl = `${appUrl}/api/webhooks/sms`
    if (!validateTwilioSignature(signature, webhookUrl, params)) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  if (!from || !body) {
    return twiml('Could not read your message. Please try again.')
  }

  // Help command
  if (/^(help|\/help|\/start)$/i.test(body)) {
    return twiml(helpMessage())
  }

  const supabase = createServiceClient()

  // Look up sender by phone number — only registered users can operate via SMS
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('phone_number', from)
    .maybeSingle()

  if (!profile) {
    return twiml(
      'Your number is not registered. Log in to the app and add your phone number in your profile settings.'
    )
  }

  const senderName = profile.full_name || 'User'
  const command = parseCommand(body)

  try {
    switch (command.type) {
      case 'status': {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .ilike('name', `%${command.propertyName}%`)
          .limit(1)

        if (!properties?.length) {
          return twiml(`Property not found: ${command.propertyName}. Check the name and try again.`)
        }

        const property = properties[0]
        const { error } = await supabase
          .from('property_status')
          .upsert(
            {
              property_id: property.id,
              status: command.status,
              occupancy: 'unoccupied',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'property_id' }
          )

        if (error) {
          return twiml(`Error updating status: ${error.message}`)
        }

        await supabase.from('audit_log').insert({
          entity_type: 'property_status',
          entity_id: property.id,
          action: 'updated',
          changed_by: profile.id,
          after_data: { status: command.status, source: 'sms', sender: senderName },
        })

        return twiml(`✓ ${property.name} status updated to: ${command.status.replace(/_/g, ' ')}`)
      }

      case 'ticket': {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .ilike('name', `%${command.propertyName}%`)
          .limit(1)

        if (!properties?.length) {
          return twiml(`Property not found: ${command.propertyName}`)
        }

        const property = properties[0]
        const { data: ticket, error } = await supabase
          .from('service_requests')
          .insert({
            property_id: property.id,
            title: command.title,
            category: command.category ?? 'other',
            priority: command.priority,
            status: 'open',
            created_by: profile.id,
          })
          .select('id')
          .single()

        if (error) {
          return twiml(`Error creating ticket: ${error.message}`)
        }

        await supabase.from('audit_log').insert({
          entity_type: 'service_request',
          entity_id: ticket.id,
          action: 'created',
          changed_by: profile.id,
          after_data: { title: command.title, property_id: property.id, source: 'sms', sender: senderName },
        })

        await sendNewTicketEmail({
          ticketId: ticket.id,
          title: command.title,
          propertyName: property.name,
          category: command.category ?? 'other',
          priority: command.priority,
        }).catch(console.error)

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
        return twiml(
          `✓ Ticket created: ${command.title}\nProperty: ${property.name}\nPriority: ${command.priority}\n${appUrl}/tickets/${ticket.id}`
        )
      }

      case 'stay': {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .ilike('name', `%${command.propertyName}%`)
          .limit(1)

        if (!properties?.length) {
          return twiml(`Property not found: ${command.propertyName}`)
        }

        const property = properties[0]
        const { data: stay, error } = await supabase
          .from('stays')
          .insert({
            property_id: property.id,
            guest_name: command.guestName,
            start_date: command.startDate,
            end_date: command.endDate,
            created_by: profile.id,
          })
          .select('id, guest_link_token')
          .single()

        if (error) {
          return twiml(`Error creating stay: ${error.message}`)
        }

        await supabase.from('audit_log').insert({
          entity_type: 'stay',
          entity_id: stay.id,
          action: 'created',
          changed_by: profile.id,
          after_data: { guest_name: command.guestName, property_id: property.id, source: 'sms', sender: senderName },
        })

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
        const guestLink = `${appUrl}/guest/${stay.guest_link_token}`
        return twiml(
          `✓ Stay created for ${command.guestName}\nProperty: ${property.name}\n${command.startDate} to ${command.endDate}\nGuest link: ${guestLink}`
        )
      }

      default: {
        return twiml('Command not recognized. Text HELP to see available commands.')
      }
    }
  } catch (err) {
    console.error('[SMS webhook error]', err)
    return twiml('An unexpected error occurred. Please try again.')
  }
}
