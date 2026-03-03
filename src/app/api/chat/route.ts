import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { handleAiSms } from '@/lib/sms/ai-handler'
import { executeAiAction } from '@/lib/actions/execute-ai-action'
import { buildWorkOrderConfirmation, buildErrorMessage } from '@/lib/confirmation-builder'
import { BASE_URL } from '@/lib/branding'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => null)
    const message = body?.message
    if (!message || typeof message !== 'string') return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const svc = createServiceClient()

    // Rate limit: max 20 user messages per minute (SOC 2 — abuse prevention)
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
    const { count: recentCount } = await svc
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', oneMinuteAgo)
    if ((recentCount ?? 0) >= 20) {
      return NextResponse.json(
        { reply: 'Too many messages. Please wait a moment before sending more.', action: 'error' },
        { status: 429 }
      )
    }

    // Get user profile
    const { data: profile } = await svc.from('profiles').select('id, full_name').eq('id', user.id).single()
    const userName = profile?.full_name || user.email || 'User'

    // Fetch recent conversation history for context (last 10 exchanges = 20 messages)
    const { data: historyRows } = await svc
      .from('conversations')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const conversationHistory = (historyRows ?? [])
      .reverse()
      .map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content as string }))

    // Save the user message (non-fatal)
    try { await svc.from('conversations').insert({ user_id: user.id, role: 'user', content: message, channel: 'web' }) } catch { /* non-fatal */ }

    // Get AI action — pass full conversation history for context memory
    const action = await handleAiSms({ userId: user.id, userName, message, conversationHistory })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

    // Execute the action if it's not a plain reply
    let reply = action.reply
    let workOrderId: string | undefined

    if (action.type !== 'reply' && action.type !== 'error') {
      const result = await executeAiAction(action, user.id, 'web', message, appUrl)
      if (!result.success) {
        const errMsg = result.error?.message ?? result.detail ?? 'Unknown error'
        reply = buildErrorMessage(action.reply, errMsg)
      } else if (result.workOrderId) {
        workOrderId = result.workOrderId
        const a = action as Record<string, unknown>
        reply = buildWorkOrderConfirmation({
          title: (a.title as string) ?? '',
          propertyName: (a.property_name as string) ?? '',
          category: (a.category as string) ?? 'other',
          priority: (a.priority as string) ?? 'medium',
          workOrderId,
          detail: result.detail ?? undefined,
        })
      } else if (result.detail) {
        reply = result.detail
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
