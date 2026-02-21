/**
 * Creates a Supabase auth user from the command line.
 * Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-user.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Run with:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/create-user.mjs')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await admin.auth.admin.createUser({
  email: 'aweitsman@awproperties.com',
  password: 'password123',
  email_confirm: true,           // skip email verification
  user_metadata: {
    full_name: 'AWeitsman',
    role: 'manager',
  },
})

if (error) {
  console.error('Failed to create user:', error.message)
  process.exit(1)
}

console.log('User created successfully!')
console.log('  ID:    ', data.user.id)
console.log('  Email: ', data.user.email)
console.log('  Role:  ', data.user.user_metadata?.role)
