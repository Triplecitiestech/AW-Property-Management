/**
 * Supabase connection config.
 *
 * NEXT_PUBLIC_* vars are baked into the JS bundle at Next.js build time.
 * If the build environment doesn't have them (misconfigured CI, Vercel cache, etc.)
 * they become `undefined` in the bundle, breaking every Supabase call with
 * "Failed to fetch". The fallbacks below guarantee the correct values are
 * always present — these are intentionally public constants (NEXT_PUBLIC_ prefix).
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ilooxnlkovwbxymwieaj.supabase.co'

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb294bmxrb3Z3Ynh5bXdpZWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MjQ4MjcsImV4cCI6MjA4NzIwMDgyN30.9v0gzuGXBBho7ucjoKr8lo3h9Ql7W56LNSa9NDBTy8M'
