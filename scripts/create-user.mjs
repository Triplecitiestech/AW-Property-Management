/**
 * Creates a Supabase auth user from the command line.
 * All values come from env vars — never hardcode credentials in this file;
 * the repo is public.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   USER_EMAIL=... USER_PASSWORD=... USER_FULL_NAME=... USER_ROLE=manager \
 *   node scripts/create-user.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = process.env.USER_EMAIL
const PASSWORD = process.env.USER_PASSWORD
const FULL_NAME = process.env.USER_FULL_NAME || ''
const ROLE = process.env.USER_ROLE || 'manager'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !EMAIL || !PASSWORD) {
  console.error('Missing env vars. Run with:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \\')
  console.error('  USER_EMAIL=<email> USER_PASSWORD=<password> \\')
  console.error('  [USER_FULL_NAME=<name>] [USER_ROLE=owner|manager] node scripts/create-user.mjs')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true, // skip email verification
  user_metadata: {
    full_name: FULL_NAME || EMAIL,
    role: ROLE,
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
