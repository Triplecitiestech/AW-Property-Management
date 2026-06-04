'use client'

import { useState, useTransition } from 'react'
import {
  seedTestBuilding,
  saveBuildingConfig,
  addUnit,
  createTenancy,
  onboardTenant,
  offboardTenant,
} from '@/lib/actions/unifi'
import type {
  UnifiBuilding,
  UnifiUnit,
  UnifiProvisioning,
  UnifiTenancyWithProvisioning,
} from '@/lib/supabase/types'

type Props = {
  mode: 'live' | 'dry-run'
  building: UnifiBuilding | null
  units: UnifiUnit[]
  tenancies: UnifiTenancyWithProvisioning[]
}

type ActionResult = { success: true; mode?: string } | { error: string }

function provisioningOf(t: UnifiTenancyWithProvisioning): UnifiProvisioning | null {
  const p = t.unifi_provisioning
  if (!p) return null
  return Array.isArray(p) ? p[0] ?? null : p
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'badge-medium',
  active: 'badge-clean',
  provisioned: 'badge-clean',
  offboarded: 'badge-closed',
  revoked: 'badge-closed',
  failed: 'badge-urgent',
}

export default function UnifiAdmin({ mode, building, units, tenancies }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  function run(fn: () => Promise<ActionResult>, okText: string, onOk?: () => void) {
    setMsg(null)
    startTransition(async () => {
      const r = await fn()
      if ('error' in r) setMsg({ kind: 'err', text: r.error })
      else {
        setMsg({ kind: 'ok', text: r.mode === 'dry-run' ? `${okText} (dry-run — no live controller calls were made)` : okText })
        onOk?.()
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>UniFi Tenant Provisioning</h1>
          <p className="text-gray-500 mt-1 text-sm">Admin-only · onboarding &amp; offboarding for Ubiquiti-equipped buildings</p>
        </div>
        <span className={`badge ${mode === 'live' ? 'badge-clean' : 'badge-medium'}`}>
          {mode === 'live' ? 'LIVE' : 'DRY-RUN'}
        </span>
      </div>

      {mode === 'dry-run' && (
        <div className="card p-4 text-sm text-amber-300 bg-amber-950/40 border border-amber-800/40">
          No UniFi controller is configured, so provisioning is <strong>simulated</strong>. Set the
          <code className="mx-1">UNIFI_*</code> env vars to go live. Everything below works end-to-end in dry-run.
        </div>
      )}

      {msg && (
        <div className={`card p-3 text-sm ${msg.kind === 'ok' ? 'text-emerald-300 border-emerald-800/40' : 'text-red-300 border-red-800/40'}`}>
          {msg.text}
        </div>
      )}

      {!building ? (
        <div className="card p-8 text-center space-y-4">
          <p className="text-gray-400 text-sm">No building configured yet.</p>
          <button
            className="btn-primary"
            disabled={isPending}
            onClick={() => run(seedTestBuilding, 'Created 257 Washington Street with 4 sample units.')}
          >
            {isPending ? 'Working…' : 'Create test building — 257 Washington Street'}
          </button>
        </div>
      ) : (
        <>
          <BuildingConfig building={building} isPending={isPending} run={run} />
          <Units building={building} units={units} isPending={isPending} run={run} />
          <Intake units={units} isPending={isPending} run={run} />
          <Tenancies units={units} tenancies={tenancies} isPending={isPending} run={run} />
        </>
      )}
    </div>
  )
}

type RunFn = (fn: () => Promise<ActionResult>, okText: string, onOk?: () => void) => void

function BuildingConfig({ building, isPending, run }: { building: UnifiBuilding; isPending: boolean; run: RunFn }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-sm mb-1">Controller configuration</h3>
      <p className="text-xs text-gray-500 mb-4">
        {building.name}{building.address ? ` · ${building.address}` : ''}. API keys live in env vars; these are the non-secret IDs.
      </p>
      <form
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          run(() => saveBuildingConfig(building.id, fd), 'Saved controller configuration.')
        }}
      >
        <Field name="console_url" label="Console URL" defaultValue={building.console_url ?? ''} placeholder="https://console.example.com" />
        <Field name="network_site_id" label="Network site ID" defaultValue={building.network_site_id ?? 'default'} />
        <Field name="front_door_group_id" label="Front access policy ID (UniFi Access)" defaultValue={building.front_door_group_id ?? ''} />
        <Field name="back_door_group_id" label="Back access policy ID (UniFi Access)" defaultValue={building.back_door_group_id ?? ''} />
        <div className="sm:col-span-2">
          <button className="btn-secondary text-sm" disabled={isPending} type="submit">Save configuration</button>
        </div>
      </form>
    </div>
  )
}

function Units({ building, units, isPending, run }: { building: UnifiBuilding; units: UnifiUnit[]; isPending: boolean; run: RunFn }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-sm mb-3">Units ({units.length})</h3>
      <div className="space-y-2 mb-4">
        {units.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 border-b border-[#1e2d42] pb-2">
            <span className="text-white font-medium w-20">{u.label}</span>
            <span>SSID: {u.wifi_ssid ?? '—'}</span>
            <span>VLAN: {u.vlan_id ?? '—'}</span>
            <span>Camera: {u.protect_camera_id ?? '—'}</span>
          </div>
        ))}
        {units.length === 0 && <p className="text-xs text-gray-500">No units yet.</p>}
      </div>
      <form
        className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget
          const fd = new FormData(form)
          run(() => addUnit(building.id, fd), 'Unit added.', () => form.reset())
        }}
      >
        <Field name="label" label="Label" placeholder="Apt 3A" />
        <Field name="wifi_ssid" label="SSID" placeholder="257Washington-3A" />
        <Field name="vlan_id" label="VLAN" placeholder="113" />
        <Field name="protect_camera_id" label="Camera ID" placeholder="optional" />
        <button className="btn-secondary text-sm" disabled={isPending} type="submit">Add unit</button>
      </form>
    </div>
  )
}

function Intake({ units, isPending, run }: { units: UnifiUnit[]; isPending: boolean; run: RunFn }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-sm mb-3">New tenant intake</h3>
      <form
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget
          const fd = new FormData(form)
          run(() => createTenancy(fd), 'Tenant added — provision them below.', () => form.reset())
        }}
      >
        <div>
          <label className="form-label">Unit</label>
          <select name="unit_id" className="form-select" required defaultValue="">
            <option value="" disabled>Select a unit</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
        <Field name="tenant_name" label="Tenant name" placeholder="Jordan Smith" required />
        <Field name="tenant_email" label="Email" type="email" placeholder="jordan@example.com" required />
        <Field name="tenant_phone" label="Phone" placeholder="+1 607 555 0142" />
        <Field name="move_in" label="Move-in" type="date" />
        <Field name="move_out" label="Move-out" type="date" />
        <label className="flex items-center gap-2 text-sm text-gray-300 sm:col-span-2">
          <input type="checkbox" name="wants_nfc" value="true" /> Tenant requested an NFC key card
        </label>
        <div className="sm:col-span-2">
          <button className="btn-primary text-sm" disabled={isPending} type="submit">Add tenant</button>
        </div>
      </form>
    </div>
  )
}

function Tenancies({ units, tenancies, isPending, run }: { units: UnifiUnit[]; tenancies: UnifiTenancyWithProvisioning[]; isPending: boolean; run: RunFn }) {
  const unitLabel = (id: string) => units.find((u) => u.id === id)?.label ?? '—'
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-sm mb-3">Tenants ({tenancies.length})</h3>
      <div className="space-y-3">
        {tenancies.map((t) => {
          const p = provisioningOf(t)
          return (
            <div key={t.id} className="border border-[#1e2d42] rounded-xl p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-white font-medium">{t.tenant_name} · <span className="text-gray-400">{unitLabel(t.unit_id)}</span></p>
                  <p className="text-xs text-gray-500">{t.tenant_email}{t.tenant_phone ? ` · ${t.tenant_phone}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${STATUS_STYLES[t.status] ?? 'badge-closed'}`}>{t.status}</span>
                  {t.status !== 'active' && (
                    <button className="btn-primary text-xs" disabled={isPending} onClick={() => run(() => onboardTenant(t.id), `Onboarded ${t.tenant_name}.`)}>
                      Provision &amp; send welcome
                    </button>
                  )}
                  {(t.status === 'active' || t.status === 'failed') && (
                    <button className="btn-secondary text-xs" disabled={isPending} onClick={() => run(() => offboardTenant(t.id), `Offboarded ${t.tenant_name}.`)}>
                      Offboard
                    </button>
                  )}
                </div>
              </div>
              {p && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                  <Detail label="Door PIN" value={p.door_pin} mono />
                  <Detail label="Wi-Fi SSID" value={p.wifi_ssid} />
                  <Detail label="Wi-Fi password" value={p.wifi_password} mono />
                  <Detail label="NFC" value={p.nfc_status} />
                  <Detail label="Access user" value={p.access_user_id} mono />
                  <Detail label="Mode" value={p.mode} />
                  {p.last_error && <div className="col-span-2 sm:col-span-4 text-red-400">Error: {p.last_error}</div>}
                </div>
              )}
            </div>
          )
        })}
        {tenancies.length === 0 && <p className="text-xs text-gray-500">No tenants yet — add one above.</p>}
      </div>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className={`text-gray-200 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  )
}

function Field({ name, label, defaultValue, placeholder, type = 'text', required = false }: {
  name: string; label: string; defaultValue?: string; placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input name={name} type={type} className="form-input" defaultValue={defaultValue} placeholder={placeholder} required={required} />
    </div>
  )
}
