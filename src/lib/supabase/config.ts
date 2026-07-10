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
  'https://vixpadnfeguwajummnfo.supabase.co'

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpeHBhZG5mZWd1d2FqdW1tbmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Mjc2NjQsImV4cCI6MjA5OTEwMzY2NH0.jLueSJ4tXjeQb9cP3eTOehBRSqK1poO_nFhT8WlFRaQ'
