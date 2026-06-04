import { randomUUID } from 'node:crypto'
import { readUniFiConfig, isUniFiLive, type UniFiConfig } from './config'
import { AccessClient } from './access'
import { NetworkClient } from './network'
import { ProtectClient } from './protect'
import type {
  UniFiProvider,
  DoorGroup,
  ProvisionAccessInput,
  ProvisionAccessResult,
  SetWifiInput,
  SetWifiResult,
  UniFiDiscovery,
} from './types'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// ── Live provider — composes the Access, Network and Protect clients ──────────

class LiveUniFiProvider implements UniFiProvider {
  readonly mode = 'live' as const
  private readonly access: AccessClient
  private readonly network: NetworkClient
  private readonly protect: ProtectClient

  constructor(cfg: UniFiConfig) {
    this.access = new AccessClient(cfg.accessApiUrl, cfg.accessApiToken)
    this.network = new NetworkClient(cfg.consoleUrl, cfg.apiKey, cfg.networkSiteId, cfg.insecureTls)
    this.protect = new ProtectClient(cfg.consoleUrl, cfg.apiKey, cfg.insecureTls)
  }

  listDoorGroups(): Promise<DoorGroup[]> {
    return this.access.listDoorGroups()
  }

  async provisionAccess(input: ProvisionAccessInput): Promise<ProvisionAccessResult> {
    const accessUserId = await this.access.createUser({ fullName: input.fullName, email: input.email })
    let pin = input.pin
    try {
      pin = await this.access.generatePin()
    } catch {
      /* keep suggested pin */
    }
    await this.access.assignPin(accessUserId, pin)
    if (input.accessPolicyIds.length > 0) {
      await this.access.assignAccessPolicies(accessUserId, input.accessPolicyIds)
    }
    return { accessUserId, pin }
  }

  async revokeAccess(accessUserId: string): Promise<void> {
    await this.access.unassignPin(accessUserId).catch(() => {})
    await this.access.deactivateUser(accessUserId)
  }

  async setWifiPassword(input: SetWifiInput): Promise<SetWifiResult> {
    if (!input.wifiNetworkId) {
      throw new Error(`No UniFi WiFi broadcast id mapped for SSID "${input.ssid}". Map the apartment's SSID first (Discover).`)
    }
    await this.network.updateWifiPassword(input.wifiNetworkId, input.password)
    return { wifiNetworkId: input.wifiNetworkId }
  }

  cameraSnapshotUrl(cameraId: string | null | undefined): string | null {
    return cameraId ? this.protect.snapshotUrl(cameraId) : null
  }

  async discover(): Promise<UniFiDiscovery> {
    const network = await (async () => {
      try {
        const siteId = await this.network.siteId()
        const wifi = await this.network.listWifi()
        return { ok: true as const, data: { siteId, wifi } }
      } catch (e) {
        return { ok: false as const, error: errMsg(e) }
      }
    })()

    const protect = await (async () => {
      try {
        const cameras = await this.protect.listCameras()
        return { ok: true as const, data: { cameras } }
      } catch (e) {
        return { ok: false as const, error: errMsg(e) }
      }
    })()

    const access = await (async () => {
      try {
        const [doorGroups, accessPolicies] = await Promise.all([
          this.access.listDoorGroups(),
          this.access.listAccessPolicies(),
        ])
        return { ok: true as const, data: { doorGroups, accessPolicies } }
      } catch (e) {
        return { ok: false as const, error: errMsg(e) }
      }
    })()

    return { mode: this.mode, network, protect, access }
  }
}

// ── Dry-run provider — realistic simulation when no controller is configured ──

class DryRunUniFiProvider implements UniFiProvider {
  readonly mode = 'dry-run' as const

  async listDoorGroups(): Promise<DoorGroup[]> {
    return [
      { id: 'dryrun-front', name: 'Front Intercom (sample)' },
      { id: 'dryrun-back', name: 'Back Door (sample)' },
    ]
  }

  async provisionAccess(input: ProvisionAccessInput): Promise<ProvisionAccessResult> {
    return { accessUserId: `dryrun-user-${randomUUID().slice(0, 8)}`, pin: input.pin }
  }

  async revokeAccess(_accessUserId: string): Promise<void> {
    /* no-op in dry-run */
  }

  async setWifiPassword(input: SetWifiInput): Promise<SetWifiResult> {
    return { wifiNetworkId: input.wifiNetworkId ?? `dryrun-wifi-${randomUUID().slice(0, 8)}` }
  }

  cameraSnapshotUrl(_cameraId: string | null | undefined): string | null {
    return null
  }

  async discover(): Promise<UniFiDiscovery> {
    return {
      mode: this.mode,
      network: {
        ok: true,
        data: {
          siteId: 'dryrun-site',
          wifi: [
            { id: 'dryrun-wifi-1a', name: '257Washington-1A' },
            { id: 'dryrun-wifi-2b', name: '257Washington-2B' },
          ],
        },
      },
      protect: { ok: true, data: { cameras: [{ id: 'dryrun-cam-front', name: 'Front Intercom (sample)' }] } },
      access: {
        ok: true,
        data: {
          doorGroups: [
            { id: 'dryrun-front', name: 'Front Intercom (sample)' },
            { id: 'dryrun-back', name: 'Back Door (sample)' },
          ],
          accessPolicies: [{ id: 'dryrun-policy-residents', name: 'Residents (sample)' }],
        },
      },
    }
  }
}

/** Returns the live provider when fully configured, otherwise the dry-run one. */
export function getUniFiProvider(): UniFiProvider {
  const cfg = readUniFiConfig()
  if (isUniFiLive() && cfg) return new LiveUniFiProvider(cfg)
  return new DryRunUniFiProvider()
}
