import Sidebar from '@/components/nav/Sidebar'
import AiChatBubble from '@/components/chat/AiChatBubble'
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
      // Upsert with update so the profile always exists even if the DB trigger
      // didn't fire (e.g. user signed up before the schema was deployed).
      const upsertData: Record<string, unknown> = {
        id: user.id,
        role: (user.user_metadata?.role as string) || 'manager',
        full_name: (user.user_metadata?.full_name as string) || user.email || '',
        email: user.email || '',
      }
      if (user.user_metadata?.phone_number) {
        upsertData.phone_number = user.user_metadata.phone_number as string
      }
      await serviceClient.from('profiles').upsert(upsertData, { onConflict: 'id' })
    } catch { /* non-fatal */ }
  }

  // Check if super admin for sidebar to show admin link
  const svc2 = createServiceClient()
  const { data: profileData } = await svc2.from('profiles').select('is_super_admin').eq('id', user.id).single()
  const isSuperAdmin = profileData?.is_super_admin ?? false

  return (
    <div className="flex min-h-screen bg-[#0f1829] relative">
      {/* Subtle grid overlay matching landing page */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      {/* Ambient glow */}
      <div className="fixed top-[-10%] right-[10%] w-[600px] h-[400px] bg-violet-600/5 rounded-full blur-3xl pointer-events-none z-0" />

      <Sidebar isSuperAdmin={isSuperAdmin} />
      <main className="flex-1 md:ml-60 min-h-screen pt-14 md:pt-0 relative z-10">
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
      <AiChatBubble />
    </div>
  )
}
