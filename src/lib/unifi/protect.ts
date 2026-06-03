import { unifiRequest } from './http'
import type { Camera } from './types'

// UniFi Protect — official Integration API.
//   Base:   https://<console>/proxy/protect/integration/v1
//   Auth:   X-API-KEY: <key>
// Used to surface the entrance/intercom camera for a unit to the building manager.

const API = '/proxy/protect/integration/v1'

export class ProtectClient {
  constructor(private readonly consoleUrl: string, private readonly apiKey: string) {}

  async listCameras(): Promise<Camera[]> {
    const res = await unifiRequest<Array<{ id: string; name?: string }>>({
      baseUrl: this.consoleUrl + API,
      path: '/cameras',
      headers: { 'X-API-KEY': this.apiKey },
    })
    return Array.isArray(res) ? res.map((c) => ({ id: c.id, name: c.name ?? c.id })) : []
  }

  /** Direct snapshot URL for a camera (requires the API key header to fetch). */
  snapshotUrl(cameraId: string): string {
    return `${this.consoleUrl}${API}/cameras/${cameraId}/snapshot`
  }
}
