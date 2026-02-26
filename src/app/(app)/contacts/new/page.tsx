import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewContactForm from '@/components/contacts/NewContactForm'

export default async function NewContactPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .order('name')

  return <NewContactForm properties={properties ?? []} />
}
