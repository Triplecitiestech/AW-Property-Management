'use server'

import { createServiceClient } from '@/lib/supabase/server'

/**
 * Given a plain username (no @ sign), look up the associated email
 * from the profiles table using the service role.
 * Returns null if not found or if SUPABASE_SERVICE_ROLE_KEY isn't set.
 */
export async function lookupUsernameEmail(username: string): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null

  try {
    const client = createServiceClient()
    const { data } = await client
      .from('profiles')
      .select('email')
      .ilike('full_name', username.trim())
      .not('email', 'is', null)
      .limit(1)
      .single()

    return data?.email ?? null
  } catch {
    return null
  }
}
