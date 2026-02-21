import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { parseCommand, helpMessage } from '@/lib/telegram/parser'
import { sendNewTicketEmail } from '@/lib/email/resend'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''

async function sendTelegramMessage(chatId: number, text: string) {
  if (!BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
}

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const secret = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { message?: { chat: { id: number }; text?: string; from?: { first_name: string } } }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const message = body.message
  if (!message || !message.text) return NextResponse.json({ ok: true })

  const chatId = message.chat.id
  const text = message.text.trim()
  const senderName = message.from?.first_name ?? 'User'

  // Help command
  if (text === '/start' || text === '/help') {
    await sendTelegramMessage(chatId, helpMessage())
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()
  const command = parseCommand(text)

  try {
    switch (command.type) {
      case 'status': {
        // Find property by name (case-insensitive)
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .ilike('name', `%${command.propertyName}%`)
          .limit(1)

        if (!properties?.length) {
          await sendTelegramMessage(chatId, `❌ Property not found: *${command.propertyName}*\n\nCheck the property name and try again.`)
          break
        }

        const property = properties[0]
        const { error } = await supabase
          .from('property_status')
          .upsert(
            { property_id: property.id, status: command.status, occupancy: 'unoccupied', updated_at: new Date().toISOString() },
            { onConflict: 'property_id' }
          )

        if (error) {
          await sendTelegramMessage(chatId, `❌ Error updating status: ${error.message}`)
        } else {
          await supabase.from('audit_log').insert({
            entity_type: 'property_status',
            entity_id: property.id,
            action: 'updated',
            after_data: { status: command.status, source: 'telegram', sender: senderName },
          })
          await sendTelegramMessage(chatId, `✅ *${property.name}* status updated to *${command.status.replace(/_/g, ' ')}*`)
        }
        break
      }

      case 'ticket': {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .ilike('name', `%${command.propertyName}%`)
          .limit(1)

        if (!properties?.length) {
          await sendTelegramMessage(chatId, `❌ Property not found: *${command.propertyName}*`)
          break
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
          })
          .select('id')
          .single()

        if (error) {
          await sendTelegramMessage(chatId, `❌ Error creating ticket: ${error.message}`)
        } else {
          await supabase.from('audit_log').insert({
            entity_type: 'service_request',
            entity_id: ticket.id,
            action: 'created',
            after_data: { title: command.title, property_id: property.id, source: 'telegram', sender: senderName },
          })
          await sendNewTicketEmail({
            ticketId: ticket.id,
            title: command.title,
            propertyName: property.name,
            category: command.category ?? 'other',
            priority: command.priority,
          }).catch(console.error)
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          await sendTelegramMessage(chatId,
            `✅ Ticket created: *${command.title}*\nProperty: ${property.name}\nPriority: *${command.priority}*\n\n[View ticket](${appUrl}/tickets/${ticket.id})`
          )
        }
        break
      }

      case 'stay': {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .ilike('name', `%${command.propertyName}%`)
          .limit(1)

        if (!properties?.length) {
          await sendTelegramMessage(chatId, `❌ Property not found: *${command.propertyName}*`)
          break
        }

        const property = properties[0]
        const { data: stay, error } = await supabase
          .from('stays')
          .insert({
            property_id: property.id,
            guest_name: command.guestName,
            start_date: command.startDate,
            end_date: command.endDate,
          })
          .select('id, guest_link_token')
          .single()

        if (error) {
          await sendTelegramMessage(chatId, `❌ Error creating stay: ${error.message}`)
        } else {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          const guestLink = `${appUrl}/guest/${stay.guest_link_token}`
          await supabase.from('audit_log').insert({
            entity_type: 'stay',
            entity_id: stay.id,
            action: 'created',
            after_data: { guest_name: command.guestName, property_id: property.id, source: 'telegram', sender: senderName },
          })
          await sendTelegramMessage(chatId,
            `✅ Stay created for *${command.guestName}*\nProperty: ${property.name}\n${command.startDate} → ${command.endDate}\n\nGuest link: ${guestLink}`
          )
        }
        break
      }

      default: {
        await sendTelegramMessage(chatId,
          `❓ I didn't understand that command.\n\nSend /help to see available commands and format.`
        )
      }
    }
  } catch (err) {
    console.error('[Telegram webhook error]', err)
    await sendTelegramMessage(chatId, '❌ An unexpected error occurred. Please try again.')
  }

  return NextResponse.json({ ok: true })
}
