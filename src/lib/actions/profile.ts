'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const full_name = (formData.get('full_name') as string)?.trim()
  const phone_number = (formData.get('phone_number') as string)?.trim() || null

  if (!full_name) return { error: 'Name is required.' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name, phone_number })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/settings')
  return { success: true }
}
