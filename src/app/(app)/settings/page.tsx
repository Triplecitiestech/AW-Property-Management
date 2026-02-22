import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getOrCreateUserOrg } from '@/lib/actions/organizations'
import OrgSettings from '@/components/settings/OrgSettings'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const orgId = await getOrCreateUserOrg()
  if (!orgId) {
    return (
      <div className="max-w-2xl">
        <h1>Settings</h1>
        <p className="text-[#6480a0] mt-2">Unable to load organization settings.</p>
      </div>
    )
  }

  const [
    { data: org },
    { data: members },
    { data: invitations },
  ] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('org_members').select('*, profiles(full_name, email)').eq('org_id', orgId).order('joined_at'),
    supabase.from('invitations').select('*').eq('org_id', orgId).is('accepted_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }),
  ])

  const currentMember = members?.find(m => m.user_id === user.id)
  const currentRole = currentMember?.role ?? 'member'

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1>Settings</h1>
        <p className="text-sm text-[#6480a0] mt-1">Manage your organization, team members, and access.</p>
      </div>
      <OrgSettings
        org={org ?? { id: orgId, name: '', created_at: '' }}
        members={members ?? []}
        invitations={invitations ?? []}
        currentUserId={user.id}
        currentRole={currentRole as 'owner' | 'admin' | 'member'}
      />
    </div>
  )
}
