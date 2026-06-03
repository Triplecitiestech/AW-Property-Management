'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { getUniFiProvider } from '@/lib/unifi/provider'
import { generatePin, generateWifiPassword } from '@/lib/unifi/credentials'
import { sendTenantWelcomeEmail, sendTenantOffboardingEmail } from '@/lib/email/unifi-emails'
import type { UnifiBuilding, UnifiUnit, UnifiTenancy } from '@/lib/supabase/types'

type Result = { success: true; mode?: string } | { error: string }

// All UniFi tables are service-role only; every action re-checks admin status.
async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return null
  return user
}

const now = () => new Date().toISOString()

// ── Seed the test building (257 Washington Street) ───────────────────────────

export async function seedTestBuilding(): Promise<Result> {
  const user = await getAdminUser()
  if (!user) return { error: 'Not authorized.' }
  const db = createServiceClient()

  const { data: existing } = await db
    .from('unifi_buildings')
    .select('id')
    .eq('name', '257 Washington Street')
    .maybeSingle()
  if (existing) return { success: true }

  // Ensure a profile row exists so properties.owner_id FK is satisfied.
  await db.from('profiles').upsert(
    { id: user.id, role: 'owner', full_name: user.user_metadata?.full_name ?? user.email ?? 'Admin', email: user.email ?? '' },
    { onConflict: 'id' },
  )

  const address = '257 Washington Street, Binghamton, NY 13901'
  const { data: property } = await db
    .from('properties')
    .insert({ name: '257 Washington Street', address, owner_id: user.id })
    .select('id')
    .single()

  const { data: building, error: bErr } = await db
    .from('unifi_buildings')
    .insert({ property_id: property?.id ?? null, name: '257 Washington Street', address, network_site_id: 'default' })
    .select('id')
    .single()
  if (bErr || !building) return { error: bErr?.message ?? 'Failed to create building.' }

  const units = ['Apt 1A', 'Apt 1B', 'Apt 2A', 'Apt 2B'].map((label, i) => ({
    building_id: building.id,
    label,
    wifi_ssid: `257Washington-${label.replace(/\D/g, '')}${label.slice(-1)}`,
    vlan_id: 110 + i,
  }))
  await db.from('unifi_units').insert(units)

  revalidatePath('/admin/unifi')
  return { success: true }
}

// ── Building / unit configuration ────────────────────────────────────────────

export async function saveBuildingConfig(buildingId: string, formData: FormData): Promise<Result> {
  if (!(await getAdminUser())) return { error: 'Not authorized.' }
  const db = createServiceClient()
  const { error } = await db
    .from('unifi_buildings')
    .update({
      console_url: (formData.get('console_url') as string)?.trim() || null,
      network_site_id: (formData.get('network_site_id') as string)?.trim() || 'default',
      front_door_group_id: (formData.get('front_door_group_id') as string)?.trim() || null,
      back_door_group_id: (formData.get('back_door_group_id') as string)?.trim() || null,
    })
    .eq('id', buildingId)
  if (error) return { error: error.message }
  revalidatePath('/admin/unifi')
  return { success: true }
}

export async function addUnit(buildingId: string, formData: FormData): Promise<Result> {
  if (!(await getAdminUser())) return { error: 'Not authorized.' }
  const label = (formData.get('label') as string)?.trim()
  if (!label) return { error: 'Unit label is required.' }
  const vlanRaw = (formData.get('vlan_id') as string)?.trim()
  const db = createServiceClient()
  const { error } = await db.from('unifi_units').insert({
    building_id: buildingId,
    label,
    wifi_ssid: (formData.get('wifi_ssid') as string)?.trim() || null,
    vlan_id: vlanRaw ? Number(vlanRaw) : null,
    door_group_id: (formData.get('door_group_id') as string)?.trim() || null,
    protect_camera_id: (formData.get('protect_camera_id') as string)?.trim() || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/unifi')
  return { success: true }
}

// ── Intake ───────────────────────────────────────────────────────────────────

export async function createTenancy(formData: FormData): Promise<Result> {
  const user = await getAdminUser()
  if (!user) return { error: 'Not authorized.' }

  const unit_id = formData.get('unit_id') as string
  const tenant_name = (formData.get('tenant_name') as string)?.trim()
  const tenant_email = (formData.get('tenant_email') as string)?.trim()
  if (!unit_id || !tenant_name || !tenant_email) {
    return { error: 'Unit, tenant name, and email are required.' }
  }

  const db = createServiceClient()
  const { error } = await db.from('unifi_tenancies').insert({
    unit_id,
    tenant_name,
    tenant_email,
    tenant_phone: (formData.get('tenant_phone') as string)?.trim() || null,
    move_in: (formData.get('move_in') as string) || null,
    move_out: (formData.get('move_out') as string) || null,
    wants_nfc: formData.get('wants_nfc') === 'true',
    created_by: user.id,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/unifi')
  return { success: true }
}

// ── Onboard: provision Access + WiFi, then send the welcome email ────────────

export async function onboardTenant(tenancyId: string): Promise<Result> {
  if (!(await getAdminUser())) return { error: 'Not authorized.' }
  const db = createServiceClient()

  const { data: tenancy } = await db.from('unifi_tenancies').select('*').eq('id', tenancyId).single()
  if (!tenancy) return { error: 'Tenancy not found.' }
  const t = tenancy as UnifiTenancy
  const { data: unitRow } = await db.from('unifi_units').select('*').eq('id', t.unit_id).single()
  const unit = unitRow as UnifiUnit | null
  if (!unit) return { error: 'Unit not found.' }
  const { data: buildingRow } = await db.from('unifi_buildings').select('*').eq('id', unit.building_id).single()
  const building = buildingRow as UnifiBuilding | null
  if (!building) return { error: 'Building not found.' }

  const provider = getUniFiProvider()
  const pin = generatePin()
  const wifiPassword = generateWifiPassword()
  const ssid = unit.wifi_ssid || `${building.name} ${unit.label}`.trim()
  const doorGroupIds = [building.front_door_group_id, building.back_door_group_id, unit.door_group_id]
    .filter((x): x is string => !!x)

  try {
    const access = await provider.provisionAccess({
      fullName: t.tenant_name,
      email: t.tenant_email,
      pin,
      doorGroupIds,
      validFrom: t.move_in,
      validUntil: t.move_out,
    })
    const wifi = await provider.setWifiPassword({
      ssid,
      password: wifiPassword,
      wifiNetworkId: unit.wifi_network_id,
      vlanId: unit.vlan_id,
    })

    if (!unit.wifi_network_id && wifi.wifiNetworkId) {
      await db.from('unifi_units').update({ wifi_network_id: wifi.wifiNetworkId, wifi_ssid: ssid }).eq('id', unit.id)
    }

    await db.from('unifi_provisioning').upsert(
      {
        tenancy_id: tenancyId,
        mode: provider.mode,
        status: 'provisioned',
        access_user_id: access.accessUserId,
        door_pin: pin,
        wifi_ssid: ssid,
        wifi_password: wifiPassword,
        nfc_status: t.wants_nfc ? 'requested' : 'none',
        last_error: null,
        provisioned_at: now(),
        updated_at: now(),
      },
      { onConflict: 'tenancy_id' },
    )
    await db.from('unifi_tenancies').update({ status: 'active' }).eq('id', tenancyId)

    await sendTenantWelcomeEmail({
      to: t.tenant_email,
      tenantName: t.tenant_name,
      buildingName: building.name,
      address: building.address,
      unitLabel: unit.label,
      moveIn: t.move_in,
      moveOut: t.move_out,
      wifiSsid: ssid,
      wifiPassword,
      doorPin: pin,
      wantsNfc: t.wants_nfc,
    }).catch(console.error)

    revalidatePath('/admin/unifi')
    return { success: true, mode: provider.mode }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Provisioning failed.'
    await db.from('unifi_provisioning').upsert(
      { tenancy_id: tenancyId, mode: provider.mode, status: 'failed', last_error: message, updated_at: now() },
      { onConflict: 'tenancy_id' },
    )
    await db.from('unifi_tenancies').update({ status: 'failed' }).eq('id', tenancyId)
    revalidatePath('/admin/unifi')
    return { error: message }
  }
}

// ── Offboard: revoke Access, rotate WiFi password, send goodbye email ─────────

export async function offboardTenant(tenancyId: string): Promise<Result> {
  if (!(await getAdminUser())) return { error: 'Not authorized.' }
  const db = createServiceClient()

  const { data: tenancy } = await db.from('unifi_tenancies').select('*').eq('id', tenancyId).single()
  if (!tenancy) return { error: 'Tenancy not found.' }
  const t = tenancy as UnifiTenancy
  const { data: provRow } = await db.from('unifi_provisioning').select('*').eq('tenancy_id', tenancyId).maybeSingle()
  const { data: unitRow } = await db.from('unifi_units').select('*').eq('id', t.unit_id).single()
  const unit = unitRow as UnifiUnit | null
  const { data: buildingRow } = unit
    ? await db.from('unifi_buildings').select('*').eq('id', unit.building_id).single()
    : { data: null }
  const building = buildingRow as UnifiBuilding | null

  const provider = getUniFiProvider()
  try {
    const accessUserId = (provRow as { access_user_id?: string } | null)?.access_user_id
    if (accessUserId) await provider.revokeAccess(accessUserId)
    if (unit?.wifi_network_id) {
      await provider.setWifiPassword({
        ssid: unit.wifi_ssid ?? '',
        password: generateWifiPassword(),
        wifiNetworkId: unit.wifi_network_id,
        vlanId: unit.vlan_id,
      })
    }

    await db.from('unifi_provisioning').update({ status: 'revoked', revoked_at: now(), updated_at: now() }).eq('tenancy_id', tenancyId)
    await db.from('unifi_tenancies').update({ status: 'offboarded' }).eq('id', tenancyId)

    if (building) {
      await sendTenantOffboardingEmail({
        to: t.tenant_email,
        tenantName: t.tenant_name,
        buildingName: building.name,
        unitLabel: unit?.label ?? '',
      }).catch(console.error)
    }

    revalidatePath('/admin/unifi')
    return { success: true, mode: provider.mode }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Offboarding failed.'
    await db.from('unifi_provisioning').update({ last_error: message, updated_at: now() }).eq('tenancy_id', tenancyId)
    revalidatePath('/admin/unifi')
    return { error: message }
  }
}
