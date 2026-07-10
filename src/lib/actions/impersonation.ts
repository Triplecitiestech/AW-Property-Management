'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { IMPERSONATE_COOKIE } from '@/lib/impersonation'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const svc = createServiceClient()
  const { data } = await svc.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!data?.is_super_admin) redirect('/dashboard')
  return { user, svc }
}

export async function startImpersonation(targetUserId: string) {
  const { user, svc } = await requireSuperAdmin()

  // Verify target user exists
  const { data: target } = await svc
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', targetUserId)
    .single()

  if (!target) return { error: 'User not found' }

  // Cannot impersonate yourself
  if (targetUserId === user.id) return { error: 'Cannot impersonate yourself' }

  // Set cookie (httpOnly, secure, 8-hour max)
  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATE_COOKIE, targetUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60, // 8 hours
  })

  // Audit log
  await svc.from('audit_log').insert({
    entity_type: 'org_member',
    entity_id: targetUserId,
    action: 'updated',
    changed_by: user.id,
    before_data: null,
    after_data: {
      action: 'impersonation_started',
      admin_id: user.id,
      target_id: targetUserId,
      target_name: target.full_name || target.email,
    },
  })

  return { success: true }
}

export async function stopImpersonation() {
  const { user, svc } = await requireSuperAdmin()

  const cookieStore = await cookies()
  const targetId = cookieStore.get(IMPERSONATE_COOKIE)?.value

  cookieStore.delete(IMPERSONATE_COOKIE)

  // Audit log
  if (targetId) {
    await svc.from('audit_log').insert({
      entity_type: 'org_member',
      entity_id: targetId,
      action: 'updated',
      changed_by: user.id,
      before_data: null,
      after_data: {
        action: 'impersonation_stopped',
        admin_id: user.id,
        target_id: targetId,
      },
    })
  }

  return { success: true }
}
