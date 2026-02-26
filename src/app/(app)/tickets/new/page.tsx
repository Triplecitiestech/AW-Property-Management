import { createClient } from '@/lib/supabase/server'
import NewTicketForm from '@/components/tickets/NewTicketForm'

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string }>
}) {
  const { property_id } = await searchParams
  const supabase = await createClient()

  const [{ data: properties }, { data: managers }, { data: contacts }] = await Promise.all([
    supabase.from('properties').select('id, name').order('name'),
    supabase.from('profiles').select('id, full_name').order('full_name'),
    supabase.from('property_contacts').select('id, property_id, name, role, email, phone').order('name'),
  ])

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  return (
    <NewTicketForm
      properties={properties ?? []}
      managers={managers ?? []}
      allContacts={contacts ?? []}
      defaultPropertyId={property_id ?? ''}
      tomorrowStr={tomorrowStr}
    />
  )
}
