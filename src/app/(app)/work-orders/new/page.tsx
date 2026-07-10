import { getAppContext } from '@/lib/impersonation'
import NewWorkOrderForm from '@/components/work-orders/NewWorkOrderForm'

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string }>
}) {
  const { property_id } = await searchParams
  const ctx = await getAppContext()
  const supabase = ctx.supabase

  const [{ data: properties }, { data: managers }, { data: contacts }, { data: units }] = await Promise.all([
    supabase.from('properties').select('id, name, property_type').order('name'),
    // RLS now scopes profiles to same-org members only (deploy.sql section 018)
    supabase.from('profiles').select('id, full_name').order('full_name'),
    supabase.from('property_contacts').select('id, property_id, name, role, email, phone').order('name'),
    supabase.from('property_units').select('id, property_id, identifier, name').eq('is_active', true).order('sort_order').order('identifier'),
  ])

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  return (
    <NewWorkOrderForm
      properties={properties ?? []}
      managers={managers ?? []}
      allContacts={contacts ?? []}
      allUnits={units ?? []}
      defaultPropertyId={property_id ?? ''}
      tomorrowStr={tomorrowStr}
    />
  )
}
