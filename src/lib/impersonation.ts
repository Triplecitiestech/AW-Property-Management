import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export const IMPERSONATE_COOKIE = 'aw_impersonate'

export interface AppContext {
  /** Supabase client — service client during impersonation, user client otherwise */
  supabase: SupabaseClient
  /** Effective user ID (impersonated user, or real user) */
  userId: string
  /** Real authenticated user ID (always the admin) */
  realUserId: string
  /** Whether impersonation is active */
  isImpersonating: boolean
  /** Target user's accessible property IDs (populated only during impersonation) */
  propertyIds: string[] | null
}

/**
 * Returns the app context for the current request.
 *
 * When impersonation is active (aw_impersonate cookie set by a super admin),
 * returns a service client and the target user's property IDs for manual filtering.
 * Pages should use `ctx.propertyIds` to scope queries when `ctx.isImpersonating` is true.
 *
 * When not impersonating, returns the normal RLS-scoped client.
 */
export async function getAppContext(): Promise<AppContext> {
  const cookieStore = await cookies()
  const impersonatingId = cookieStore.get(IMPERSONATE_COOKIE)?.value

  // Always authenticate the real user first
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  if (!impersonatingId) {
    return {
      supabase,
      userId: user.id,
      realUserId: user.id,
      isImpersonating: false,
      propertyIds: null,
    }
  }

  // Verify caller is actually a super admin
  const svc = createServiceClient()
  const { data: profile } = await svc
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    // Not a super admin — ignore the cookie silently
    return {
      supabase,
      userId: user.id,
      realUserId: user.id,
      isImpersonating: false,
      propertyIds: null,
    }
  }

  // Get the target user's accessible property IDs (mirrors RLS logic)
  const propertyIds = await getUserPropertyIds(svc, impersonatingId)

  return {
    supabase: svc,
    userId: impersonatingId,
    realUserId: user.id,
    isImpersonating: true,
    propertyIds,
  }
}

/**
 * Returns the impersonation state for UI rendering (layout, banner).
 * Lighter than getAppContext — doesn't prefetch property IDs.
 */
export async function getImpersonationState() {
  const cookieStore = await cookies()
  const targetId = cookieStore.get(IMPERSONATE_COOKIE)?.value
  if (!targetId) return { active: false, targetId: null, targetName: null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { active: false, targetId: null, targetName: null }

  const svc = createServiceClient()
  const { data: callerProfile } = await svc
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!callerProfile?.is_super_admin) {
    return { active: false, targetId: null, targetName: null }
  }

  const { data: targetProfile } = await svc
    .from('profiles')
    .select('full_name, email')
    .eq('id', targetId)
    .single()

  return {
    active: true,
    targetId,
    targetName: targetProfile?.full_name || targetProfile?.email || targetId,
  }
}

/**
 * Get all property IDs a user can access (mirrors can_access_property RLS logic).
 * Used during impersonation to manually scope queries.
 */
async function getUserPropertyIds(svc: SupabaseClient, userId: string): Promise<string[]> {
  const [
    { data: owned },
    { data: orgMems },
    { data: accessGrants },
  ] = await Promise.all([
    svc.from('properties').select('id').eq('owner_id', userId),
    svc.from('org_members').select('org_id').eq('user_id', userId),
    svc.from('property_access').select('property_id').eq('user_id', userId),
  ])

  const orgIds = orgMems?.map((m: { org_id: string }) => m.org_id) ?? []
  let orgProps: { id: string }[] = []
  if (orgIds.length > 0) {
    const { data } = await svc.from('properties').select('id').in('org_id', orgIds)
    orgProps = data ?? []
  }

  const ids = new Set([
    ...(owned?.map((p: { id: string }) => p.id) ?? []),
    ...orgProps.map((p) => p.id),
    ...(accessGrants?.map((a: { property_id: string }) => a.property_id) ?? []),
  ])

  return Array.from(ids)
}
