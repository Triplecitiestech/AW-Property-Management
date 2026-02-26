import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const OK = NextResponse.json({ ok: true })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json().catch(() => ({}))
    const { level = 'error', source, route, message, stack, metadata } = body

    if (!source || !message) return OK // silently skip malformed payloads

    // Rate-limit: max 20 errors per user per minute (prevent log floods)
    const svc = createServiceClient()
    if (user) {
      const since = new Date(Date.now() - 60_000).toISOString()
      const { count } = await svc
        .from('error_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', since)
      if ((count ?? 0) >= 20) return OK
    }

    await svc.from('error_logs').insert({
      level,
      source,
      route: route ?? null,
      message: String(message).slice(0, 2000),
      stack: stack ? String(stack).slice(0, 5000) : null,
      user_id: user?.id ?? null,
      metadata: metadata ?? null,
      resolved: false,
    })
  } catch {
    // Never let the logging endpoint itself crash the app
  }
  return OK
}
