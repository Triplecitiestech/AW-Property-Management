import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/welcome'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if user signed up with a free invite code (stored in user_metadata)
      const { data: { user } } = await supabase.auth.getUser()
      const inviteCode = user?.user_metadata?.free_invite_code
      if (inviteCode && user) {
        try {
          const svc = createServiceClient()
          // Find the code
          const { data: invite } = await svc
            .from('free_invite_codes')
            .select('id, label, code, max_uses, used_count, expires_at, is_active')
            .eq('code', inviteCode)
            .eq('is_active', true)
            .single()

          if (invite &&
              (!invite.expires_at || new Date(invite.expires_at) > new Date()) &&
              (invite.max_uses === null || invite.used_count < invite.max_uses)) {
            // Check if already exempt (avoid double-counting)
            const { data: profile } = await svc
              .from('profiles')
              .select('billing_exempt')
              .eq('id', user.id)
              .single()

            if (!profile?.billing_exempt) {
              await svc
                .from('profiles')
                .update({
                  billing_exempt: true,
                  billing_exempt_reason: `Free invite: ${invite.label || invite.code}`,
                })
                .eq('id', user.id)

              await svc
                .from('free_invite_codes')
                .update({ used_count: invite.used_count + 1 })
                .eq('id', invite.id)
            }
          }
        } catch {
          // Non-blocking — don't fail the auth callback
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
