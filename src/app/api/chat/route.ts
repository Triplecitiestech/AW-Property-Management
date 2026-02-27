import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { handleAiSms } from '@/lib/sms/ai-handler'
import { executeAiAction } from '@/lib/actions/execute-ai-action'

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

    // Save the user message (non-fatal — PostgrestFilterBuilder has no .catch(), use try/catch)
    try { await svc.from('conversations').insert({ user_id: user.id, role: 'user', content: message, channel: 'web' }) } catch { /* non-fatal */ }

    // Get AI action
    const action = await handleAiSms({ userId: user.id, userName, message })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

    // Execute the action if it's not a plain reply
    let reply = action.reply
    let workOrderId: string | undefined

    if (action.type !== 'reply' && action.type !== 'error') {
      const result = await executeAiAction(action, user.id, 'web', message, appUrl)
      if (!result.success) {
        reply = `${action.reply}\n\n⚠ Could not complete: ${result.detail}`
      } else if (result.workOrderId) {
        workOrderId = result.workOrderId
        reply = `${action.reply}\n\n👉 ${appUrl}/work-orders/${workOrderId}`
      }
    }

    // Save the assistant reply (non-fatal)
    try { await svc.from('conversations').insert({ user_id: user.id, role: 'assistant', content: reply, channel: 'web' }) } catch { /* non-fatal */ }

    // Track token usage (non-fatal)
    try {
      await svc.from('ai_usage').insert({
        user_id: user.id,
        feature: 'chat',
        tokens_in: Math.ceil(message.length / 4),
        tokens_out: Math.ceil(reply.length / 4),
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ reply, action: action.type, workOrderId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? (err.stack ?? '') : ''
    console.error('[/api/chat POST error]', err)
    try {
      const svc2 = createServiceClient()
      await svc2.from('error_logs').insert({ source: 'server', route: '/api/chat', message: msg, stack, resolved: false })
    } catch { /* best-effort */ }
    return NextResponse.json({ reply: 'Sorry, something went wrong. Please try again in a moment.' }, { status: 200 })
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
