'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getAppContext } from '@/lib/impersonation'

async function requireSuperAdmin() {
  const ctx = await getAppContext()
  const svc = createServiceClient()
  const { data: profile } = await svc
    .from('profiles')
    .select('is_super_admin')
    .eq('id', ctx.userId)
    .single()

  if (!profile?.is_super_admin) {
    throw new Error('Unauthorized: super admin required')
  }
  return { ctx, svc }
}

export async function createFreeInviteCode(label: string, maxUses: number | null) {
  const { ctx, svc } = await requireSuperAdmin()

  const { data, error } = await svc
    .from('free_invite_codes')
    .insert({
      label,
      max_uses: maxUses,
      created_by: ctx.realUserId,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deactivateFreeInviteCode(codeId: string) {
  const { svc } = await requireSuperAdmin()

  const { error } = await svc
    .from('free_invite_codes')
    .update({ is_active: false })
    .eq('id', codeId)

  if (error) throw new Error(error.message)
}

export async function toggleBillingExempt(userId: string, exempt: boolean, reason: string) {
  const { svc } = await requireSuperAdmin()

  const { error } = await svc
    .from('profiles')
    .update({
      billing_exempt: exempt,
      billing_exempt_reason: exempt ? reason : null,
    })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

export async function getFreeInviteCodes() {
  const { svc } = await requireSuperAdmin()

  const { data, error } = await svc
    .from('free_invite_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function redeemFreeInviteCode(code: string, userId: string) {
  const svc = createServiceClient()

  // Find the code
  const { data: invite, error: findErr } = await svc
    .from('free_invite_codes')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (findErr || !invite) return { success: false, error: 'Invalid invite code' }

  // Check expiration
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { success: false, error: 'Invite code has expired' }
  }

  // Check uses
  if (invite.max_uses !== null && invite.used_count >= invite.max_uses) {
    return { success: false, error: 'Invite code has reached its usage limit' }
  }

  // Mark user as billing exempt
  const { error: profileErr } = await svc
    .from('profiles')
    .update({
      billing_exempt: true,
      billing_exempt_reason: `Free invite: ${invite.label || invite.code}`,
    })
    .eq('id', userId)

  if (profileErr) return { success: false, error: profileErr.message }

  // Increment used_count
  await svc
    .from('free_invite_codes')
    .update({ used_count: invite.used_count + 1 })
    .eq('id', invite.id)

  return { success: true }
}
