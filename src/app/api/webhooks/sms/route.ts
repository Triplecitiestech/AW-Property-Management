import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAiSms } from '@/lib/sms/ai-handler'
import { executeAiAction } from '@/lib/actions/execute-ai-action'

const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? ''

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

function twiml(message: string): NextResponse {
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

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const params = Object.fromEntries(new URLSearchParams(raw).entries())

  const from: string = params['From'] ?? ''
  const body: string = params['Body']?.trim() ?? ''

  if (AUTH_TOKEN) {
    const signature = req.headers.get('x-twilio-signature') ?? ''
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('phone_number', from)
    .maybeSingle()

  if (!profile) {
    return twiml(
      'Your number is not registered. Sign up at smartsumai.com and add your phone number in Settings > Profile.'
    )
  }

  // Save inbound SMS to conversation history (fire-and-forget)
  supabase.from('conversations').insert({ user_id: profile.id, role: 'user', content: body, channel: 'sms' }).then(undefined, () => {})

  // Quick HELP shortcut
  if (/^(help|\/help|\/start|hi|hello|hey)$/i.test(body)) {
    return twiml(
      `Hi ${profile.full_name?.split(' ')[0] ?? 'there'}! I'm your Smart Sumai AI. I can:\n\n` +
      `• Check property status\n` +
      `• Create work orders\n` +
      `• Schedule guest stays\n` +
      `• Add contacts\n\n` +
      `Just text me naturally! e.g. "Leaking faucet at Lake Cabin, urgent"`
    )
  }

  // Fetch recent SMS conversation history for context memory (last 10 exchanges)
  const { data: historyRows } = await supabase
    .from('conversations')
    .select('role, content')
    .eq('user_id', profile.id)
    .eq('channel', 'sms')
    .order('created_at', { ascending: false })
    .limit(20)

  const conversationHistory = (historyRows ?? [])
    .reverse()
    .map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content as string }))

  // Route to AI handler with conversation history
  const action = await handleAiSms({
    userId: profile.id,
    userName: profile.full_name ?? 'User',
    message: body,
    conversationHistory,
  })

  // Save AI reply to conversation history (fire-and-forget)
  supabase.from('conversations').insert({ user_id: profile.id, role: 'assistant', content: action.reply, channel: 'sms' }).then(undefined, () => {})
  supabase.from('ai_usage').insert({ user_id: profile.id, feature: 'sms', tokens_in: Math.ceil(body.length / 4), tokens_out: Math.ceil(action.reply.length / 4) }).then(undefined, () => {})

  // Execute the action
  try {
    if (action.type === 'create_work_order' || action.type === 'create_stay' || action.type === 'update_status' || action.type === 'create_contact') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
      const result = await executeAiAction(action, profile.id, 'sms', body, appUrl)

      if (!result.success) {
        return twiml(`${action.reply}\n\n⚠ ${result.detail}`)
      }

      if (action.type === 'create_work_order' && result.workOrderId) {
        const appUrl2 = process.env.NEXT_PUBLIC_APP_URL ?? ''
        return twiml(`${action.reply}\n${result.detail ?? ''}\n${appUrl2}/work-orders/${result.workOrderId}`)
      }

      if (result.detail) {
        return twiml(`${action.reply}\n${result.detail}`)
      }

      return twiml(action.reply)
    }

    return twiml(action.reply || 'Something went wrong. Please try again.')
  } catch (err) {
    console.error('[SMS webhook execution error]', err)
    return twiml('An unexpected error occurred. Please try again or text HELP.')
  }
}
