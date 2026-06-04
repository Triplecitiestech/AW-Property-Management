import { unifiRequest } from './http'
import type { WifiNetwork } from './types'

// UniFi Network — official Integration API (verified against v10.4.57 docs).
//   Base:  https://<console>/proxy/network/integration/v1
//   Auth:  X-API-KEY
//   WiFi:  /v1/sites/{siteId}/wifi/broadcasts  (full-object PUT to change passphrase)

const API = '/proxy/network/integration/v1'

type Paginated<T> = { data?: T[] }
type RawSite = { id: string; name?: string }
type WifiBroadcast = {
  id: string
  name?: string
  enabled?: boolean
  securityConfiguration?: Record<string, unknown>
  [k: string]: unknown
}

export class NetworkClient {
  private siteIdPromise: Promise<string> | null = null

  constructor(
    private readonly consoleUrl: string,
    private readonly apiKey: string,
    private readonly configuredSiteId?: string,
    private readonly insecure = false,
  ) {}

  private req<T>(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: unknown) {
    return unifiRequest<T>({
      baseUrl: this.consoleUrl + API,
      path,
      method,
      body,
      headers: { 'X-API-KEY': this.apiKey },
      insecure: this.insecure,
    })
  }

  async listSites(): Promise<RawSite[]> {
    const res = await this.req<Paginated<RawSite>>('/v1/sites')
    return res.data ?? []
  }

  /** Resolve the site UUID — the configured one, else the first local site. */
  async siteId(): Promise<string> {
    if (this.configuredSiteId) return this.configuredSiteId
    if (!this.siteIdPromise) {
      this.siteIdPromise = this.listSites().then((sites) => {
        const id = sites[0]?.id
        if (!id) throw new Error('UniFi Network: GET /sites returned no sites')
        return id
      })
    }
    return this.siteIdPromise
  }

  async listWifi(): Promise<WifiNetwork[]> {
    const site = await this.siteId()
    const res = await this.req<Paginated<WifiBroadcast>>(`/v1/sites/${site}/wifi/broadcasts`)
    return (res.data ?? []).map((w) => ({ id: w.id, name: w.name ?? '', enabled: w.enabled }))
  }

  /**
   * Set/rotate a WiFi broadcast's PSK passphrase via a full-object PUT (read,
   * modify securityConfiguration.passphrase, write back). NOTE: confirm the exact
   * PSK field for your Network version (used here as `passphrase`).
   */
  async updateWifiPassword(wifiBroadcastId: string, passphrase: string): Promise<void> {
    const site = await this.siteId()
    const current = await this.req<WifiBroadcast>(`/v1/sites/${site}/wifi/broadcasts/${wifiBroadcastId}`)
    await this.req(`/v1/sites/${site}/wifi/broadcasts/${wifiBroadcastId}`, 'PUT', {
      ...current,
      securityConfiguration: { ...(current.securityConfiguration ?? {}), passphrase },
    })
  }
}
