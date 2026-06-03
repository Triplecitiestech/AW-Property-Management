import { unifiRequest } from './http'
import type { WifiNetwork } from './types'

// UniFi Network — official Integration API.
//   Base:   https://<console>/proxy/network/integration/v1
//   Auth:   X-API-KEY: <key>
//   Ref:    https://developer.ui.com/network/
//
// Their setup: each apartment has its own SSID + VLAN, so onboarding sets/rotates
// that SSID's passphrase and offboarding rotates it again to revoke. NOTE: the
// exact resource name (wifi-broadcasts) and passphrase field should be confirmed
// against the deployed Network version; the dry-run path is unaffected.

const API = '/proxy/network/integration/v1'

type RawWifi = { id: string; name?: string; ssid?: string; enabled?: boolean; vlan_id?: number }

export class NetworkClient {
  constructor(
    private readonly consoleUrl: string,
    private readonly apiKey: string,
    private readonly siteId: string,
  ) {}

  private req<T>(path: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', body?: unknown) {
    return unifiRequest<T>({
      baseUrl: this.consoleUrl + API,
      path,
      method,
      headers: { 'X-API-KEY': this.apiKey },
      body,
    })
  }

  async listWifi(): Promise<WifiNetwork[]> {
    const res = await this.req<{ data?: RawWifi[] }>(`/sites/${this.siteId}/wifi-broadcasts`, 'GET')
    return (res.data ?? []).map((w) => ({
      id: w.id,
      name: w.name ?? w.ssid ?? '',
      enabled: w.enabled,
      vlanId: w.vlan_id ?? null,
    }))
  }

  async updateWifiPassword(wifiNetworkId: string, password: string): Promise<void> {
    await this.req(`/sites/${this.siteId}/wifi-broadcasts/${wifiNetworkId}`, 'PATCH', {
      passphrase: password,
    })
  }

  async createWifi(input: { ssid: string; password: string; vlanId?: number | null }): Promise<string> {
    const res = await this.req<{ data?: { id?: string }; id?: string }>(
      `/sites/${this.siteId}/wifi-broadcasts`,
      'POST',
      {
        name: input.ssid,
        passphrase: input.password,
        ...(input.vlanId ? { vlan_id: input.vlanId } : {}),
      },
    )
    const id = res.data?.id ?? res.id
    if (!id) throw new Error('UniFi Network: created WiFi but no id returned')
    return id
  }
}
