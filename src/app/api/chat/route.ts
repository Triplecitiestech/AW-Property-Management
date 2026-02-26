import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { handleAiSms } from '@/lib/sms/ai-handler'

export const maxDuration = 30 // seconds — Anthropic API can take a few seconds

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => null)
    const message = body?.message
    if (!message || typeof message !== 'string') return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const svc = createServiceClient()

    // Get user profile
    const { data: profile } = await svc.from('profiles').select('id, full_name').eq('id', user.id).single()
    const userName = profile?.full_name || user.email || 'User'

    // Save the user message to conversations (non-fatal if it fails)
    await svc.from('conversations').insert({ user_id: user.id, role: 'user', content: message, channel: 'web' }).catch(() => {})

    // Use the same AI handler as SMS for consistent behavior
    const action = await handleAiSms({ userId: user.id, userName, message })
    const reply = action.reply

    // Save the assistant reply (non-fatal)
    await svc.from('conversations').insert({ user_id: user.id, role: 'assistant', content: reply, channel: 'web' }).catch(() => {})

    // Track token usage (non-fatal)
    await svc.from('ai_usage').insert({
      user_id: user.id,
      feature: 'chat',
      tokens_in: Math.ceil(message.length / 4),
      tokens_out: Math.ceil(reply.length / 4),
    }).catch(() => {})

    return NextResponse.json({ reply, action: action.type })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? (err.stack ?? '') : ''
    console.error('[/api/chat POST error]', err)
    // Log to error_logs so it's queryable
    try {
      const svc2 = createServiceClient()
      await svc2.from('error_logs').insert({
        source: 'server',
        route: '/api/chat',
        message: msg,
        stack,
        resolved: false,
      })
    } catch { /* best-effort */ }
    return NextResponse.json({ reply: 'Sorry, something went wrong on our end. Please try again in a moment.' }, { status: 200 })
  }
}

// GET — fetch conversation history (last 50 messages, both channels)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: messages } = await supabase
    .from('conversations')
    .select('id, role, content, channel, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ messages: (messages ?? []).reverse() })
}
