import { unifiRequest } from './http'
import type { DoorGroup } from './types'

// UniFi Access — official Developer API.
//   Base:   https://<host>:12445/api/v1/developer
//   Auth:   Authorization: Bearer <token>   (token from the UniFi Access app settings)
//   Ref:    https://assets.identity.ui.com/unifi-access/api_reference.pdf
//
// NOTE: exact request field names for PIN assignment and resource/door-group
// binding should be confirmed against the API reference for the deployed Access
// version. The orchestration + dry-run path do not depend on these specifics.

const API = '/api/v1/developer'

type Envelope<T> = { code?: string; msg?: string; data?: T }

export class AccessClient {
  constructor(private readonly baseUrl: string, private readonly token: string) {}

  private req<T>(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: unknown) {
    return unifiRequest<Envelope<T>>({
      baseUrl: this.baseUrl + API,
      path,
      method,
      headers: { Authorization: `Bearer ${this.token}` },
      body,
    })
  }

  async listDoorGroups(): Promise<DoorGroup[]> {
    const res = await this.req<Array<{ id: string; name: string }>>('/door_groups', 'GET')
    return (res.data ?? []).map((g) => ({ id: g.id, name: g.name }))
  }

  /** Create an Access user (resident) and return its id. */
  async createUser(input: { fullName: string; email: string }): Promise<string> {
    const [first, ...rest] = input.fullName.trim().split(/\s+/)
    const res = await this.req<{ id: string }>('/users', 'POST', {
      first_name: first || input.fullName,
      last_name: rest.join(' ') || first || '-',
      user_email: input.email,
    })
    const id = res.data?.id
    if (!id) throw new Error('UniFi Access: created user but no id returned')
    return id
  }

  /** Assign a PIN code to a user. */
  async setUserPin(userId: string, pin: string): Promise<void> {
    await this.req(`/users/${userId}`, 'PUT', { pin_code: pin })
  }

  /** Grant the user the given Access resources (door-group / access-policy ids). */
  async assignResources(userId: string, resourceIds: string[]): Promise<void> {
    const ids = resourceIds.filter(Boolean)
    if (ids.length === 0) return
    await this.req(`/users/${userId}/access_policies`, 'PUT', { access_policy_ids: ids })
  }

  /** Remove the Access user entirely (used at offboarding). */
  async deleteUser(userId: string): Promise<void> {
    await this.req(`/users/${userId}`, 'DELETE')
  }
}
