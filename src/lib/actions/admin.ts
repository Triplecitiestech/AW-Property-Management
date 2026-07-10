'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const svc = createServiceClient()
  const { data } = await svc.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!data?.is_super_admin) redirect('/dashboard')
  return { user, svc }
}

export async function deleteUserAccount(targetUserId: string) {
  const { svc } = await requireSuperAdmin()
  // Delete auth user — cascades to profiles, properties, etc. via FK
  await svc.auth.admin.deleteUser(targetUserId)
  revalidatePath('/admin')
}

export async function updateFeatureRequestStatus(requestId: string, status: string) {
  const { svc } = await requireSuperAdmin()
  await svc.from('feature_requests').update({ status }).eq('id', requestId)
  revalidatePath('/admin')
}

// User-facing: request account deletion (routes to support)
export async function requestAccountDeletion(reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Send email to admin for approval
  const { Resend } = await import('resend')
  const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  if (resendClient) {
    await resendClient.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'notifications@resend.dev',
      to: 'admin@smartsumai.com',
      subject: `Account Deletion Request — ${user.email}`,
      html: `<p>User <strong>${user.email}</strong> (ID: ${user.id}) has requested account deletion.</p>
             <p>Reason: ${reason ?? 'Not provided'}</p>
             <p>Please review and delete from the <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin">Admin Dashboard</a>.</p>`,
    })
  }

  return { success: true }
}

// Feature request submission
export async function submitFeatureRequest(title: string, description: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase.from('feature_requests').insert({
    user_id: user.id,
    title: title.trim(),
    description: description.trim() || null,
  })

  revalidatePath('/settings')
  return error ? { error: error.message } : { success: true }
}
