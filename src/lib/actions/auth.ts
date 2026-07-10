'use server'

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Given a plain username (no @ sign), look up the associated email via
 * the auth admin API (profiles table → auth.users).
 * Returns null if not found or if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export async function lookupUsernameEmail(username: string): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null

  try {
    const client = createServiceClient()

    // Step 1: find the auth user ID from full_name in profiles
    const { data: profile } = await client
      .from('profiles')
      .select('id')
      .ilike('full_name', username.trim())
      .limit(1)
      .single()

    if (!profile?.id) return null

    // Step 2: fetch the email from auth.users via the admin API
    const { data: { user }, error } = await client.auth.admin.getUserById(profile.id)
    if (error || !user?.email) return null

    return user.email
  } catch {
    return null
  }
}

/**
 * Permanently delete the currently authenticated user's account and all
 * their data (cascades via FK ON DELETE CASCADE in Supabase schema).
 * Requires SUPABASE_SERVICE_ROLE_KEY.
 */
export async function deleteAccount(): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const svc = createServiceClient()

  // Sign the user out of all sessions first
  await supabase.auth.signOut()

  // Delete the auth user via the admin API — all FK-cascaded data is removed automatically
  const { error } = await svc.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message }

  redirect('/')
}
