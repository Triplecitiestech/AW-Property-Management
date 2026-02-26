import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { handleAiSms } from '@/lib/sms/ai-handler'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await req.json()
  if (!message || typeof message !== 'string') return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const svc = createServiceClient()

  // Get user profile
  const { data: profile } = await svc.from('profiles').select('id, full_name').eq('id', user.id).single()
  const userName = profile?.full_name || user.email || 'User'

  // Save the user message to conversations
  await svc.from('conversations').insert({ user_id: user.id, role: 'user', content: message, channel: 'web' })

  // Use the same AI handler as SMS for consistent behavior
  const action = await handleAiSms({ userId: user.id, userName, message })
  const reply = action.reply

  // Save the assistant reply
  await svc.from('conversations').insert({ user_id: user.id, role: 'assistant', content: reply, channel: 'web' })

  // Track token usage (approximate — haiku is cheap but we log it for admin dashboard)
  await svc.from('ai_usage').insert({
    user_id: user.id,
    feature: 'chat',
    tokens_in: Math.ceil(message.length / 4),
    tokens_out: Math.ceil(reply.length / 4),
  }).catch(() => {})

  return NextResponse.json({ reply, action: action.type })
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
