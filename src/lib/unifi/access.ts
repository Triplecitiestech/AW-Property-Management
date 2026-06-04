import { unifiRequest } from './http'
import type { DoorGroup } from './types'

// UniFi Access — official Developer API (verified against the API reference).
//   Base:   https://<host>:12445/api/v1/developer
//   Auth:   Authorization: Bearer <token>   (Access app → Settings → General → Advanced → API Token)
//   TLS:    self-signed certificate → all requests use insecure: true
//   Envelope: { code: "SUCCESS", msg, data }

const API = '/api/v1/developer'

type Envelope<T> = { code?: string; msg?: string; data?: T }

export class AccessClient {
  constructor(private readonly baseUrl: string, private readonly token: string) {}

  private async req<T>(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: unknown): Promise<T> {
    const res = await unifiRequest<Envelope<T>>({
      baseUrl: this.baseUrl + API,
      path,
      method,
      body,
      headers: { Authorization: `Bearer ${this.token}` },
      insecure: true,
    })
    if (res.code && res.code !== 'SUCCESS') {
      throw new Error(`UniFi Access ${method} ${path}: ${res.msg || res.code}`)
    }
    return res.data as T
  }

  async listDoorGroups(): Promise<DoorGroup[]> {
    const data = await this.req<Array<{ id: string; name: string }>>('/door_groups', 'GET')
    return (data ?? []).map((g) => ({ id: g.id, name: g.name }))
  }

  async listAccessPolicies(): Promise<Array<{ id: string; name: string }>> {
    const data = await this.req<Array<{ id: string; name: string }>>('/access_policies', 'GET')
    return (data ?? []).map((p) => ({ id: p.id, name: p.name }))
  }

  /** Register a resident user; returns the new user id. */
  async createUser(input: { fullName: string; email: string }): Promise<string> {
    const [first, ...rest] = input.fullName.trim().split(/\s+/)
    const data = await this.req<{ id: string }>('/users', 'POST', {
      first_name: first || input.fullName,
      last_name: rest.join(' ') || first || '-',
      user_email: input.email,
    })
    if (!data?.id) throw new Error('UniFi Access: created user but no id returned')
    return data.id
  }

  /** Ask Access to generate a PIN that satisfies the console's configured length. */
  async generatePin(): Promise<string> {
    const data = await this.req<string>('/credentials/pin_codes', 'POST', {})
    if (!data) throw new Error('UniFi Access: no PIN returned')
    return data
  }

  async assignPin(userId: string, pin: string): Promise<void> {
    await this.req(`/users/${userId}/pin_codes`, 'PUT', { pin_code: pin })
  }

  async unassignPin(userId: string): Promise<void> {
    await this.req(`/users/${userId}/pin_codes`, 'DELETE')
  }

  /** Grant the user a set of Access policies (each binds doors/door-groups + a schedule). */
  async assignAccessPolicies(userId: string, accessPolicyIds: string[]): Promise<void> {
    await this.req(`/users/${userId}/access_policies`, 'PUT', { access_policy_ids: accessPolicyIds })
  }

  /** Offboarding: deactivate the user so all of their credentials stop working. */
  async deactivateUser(userId: string): Promise<void> {
    await this.req(`/users/${userId}`, 'PUT', { status: 'DEACTIVATED' })
  }
}
