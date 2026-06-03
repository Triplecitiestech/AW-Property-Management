import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { currentMode } from '@/lib/unifi/config'
import UnifiAdmin from '@/components/admin/UnifiAdmin'
import type { UnifiBuilding, UnifiUnit, UnifiTenancyWithProvisioning } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export default async function UnifiAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  // Siloed: admin-only during testing.
  if (!isAdminEmail(user.email)) redirect('/dashboard')

  const db = createServiceClient()
  const { data: buildings } = await db.from('unifi_buildings').select('*').order('created_at')
  const building = (buildings?.[0] ?? null) as UnifiBuilding | null

  let units: UnifiUnit[] = []
  let tenancies: UnifiTenancyWithProvisioning[] = []
  if (building) {
    const { data: u } = await db.from('unifi_units').select('*').eq('building_id', building.id).order('label')
    units = (u ?? []) as UnifiUnit[]
    if (units.length > 0) {
      const { data: tt } = await db
        .from('unifi_tenancies')
        .select('*, unifi_provisioning(*)')
        .in('unit_id', units.map((x) => x.id))
        .order('created_at', { ascending: false })
      tenancies = (tt ?? []) as UnifiTenancyWithProvisioning[]
    }
  }

  return <UnifiAdmin mode={currentMode()} building={building} units={units} tenancies={tenancies} />
}
