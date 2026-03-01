import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getAppContext, type AppContext } from '@/lib/impersonation'

/**
 * Authenticate the current user or redirect to login.
 * Returns the Supabase client and user object.
 */
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return { supabase, user }
}

/**
 * Require super admin access. Redirects non-admins to /dashboard.
 * Uses the REAL user identity (not impersonated) because admin access
 * is a property of the logged-in account, not the effective user.
 */
export async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const svc = createServiceClient()
  const { data } = await svc.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!data?.is_super_admin) redirect('/dashboard')
  return { user, svc }
}

/**
 * Get the impersonation-aware app context.
 * All data queries in (app) pages should use this.
 */
export async function requireAppContext(): Promise<AppContext> {
  return getAppContext()
}

/**
 * Verify that the effective user can access a specific property.
 * During impersonation, checks ctx.propertyIds.
 * During normal access, RLS handles it, but this provides defense-in-depth.
 */
export function requirePropertyAccess(ctx: AppContext, propertyId: string): boolean {
  if (!ctx.isImpersonating) {
    // RLS enforces access; this is a no-op for non-impersonation
    return true
  }
  if (!ctx.propertyIds) return false
  return ctx.propertyIds.includes(propertyId)
}

/**
 * Scope a Supabase query by the effective user's accessible property IDs.
 * Use this when querying tenant-scoped data during impersonation.
 *
 * Returns the property IDs to filter by, or null if RLS handles it.
 */
export function getScopedPropertyIds(ctx: AppContext): string[] | null {
  if (!ctx.isImpersonating) return null
  return ctx.propertyIds ?? []
}
