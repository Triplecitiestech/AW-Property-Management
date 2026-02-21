import Sidebar from '@/components/nav/Sidebar'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Ensure a profile row exists — handles the case where the DB trigger
  // didn't fire (e.g. user signed up before the schema was deployed).
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const serviceClient = createServiceClient()
      await serviceClient.from('profiles').upsert({
        id: user.id,
        role: (user.user_metadata?.role as string) || 'owner',
        full_name: (user.user_metadata?.full_name as string) || user.email || '',
        email: user.email || '',
      }, { onConflict: 'id', ignoreDuplicates: true })
    } catch { /* non-fatal */ }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen">
        <div className="max-w-6xl mx-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
