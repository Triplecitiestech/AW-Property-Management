import { requireAppContext } from '@/lib/auth/guards'
import NewContactForm from '@/components/contacts/NewContactForm'

export default async function NewContactPage() {
  const ctx = await requireAppContext()

  const { data: properties } = await ctx.supabase
    .from('properties')
    .select('id, name')
    .order('name')

  return <NewContactForm properties={properties ?? []} />
}
