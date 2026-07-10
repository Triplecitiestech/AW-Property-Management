import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const svc = createServiceClient()
  const { data: profile } = await svc.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) redirect('/dashboard')

  return <>{children}</>
}
