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
} from './types'

// ── Live provider — composes the Access, Network and Protect clients ──────────

class LiveUniFiProvider implements UniFiProvider {
  readonly mode = 'live' as const
  private readonly access: AccessClient
  private readonly network: NetworkClient
  private readonly protect: ProtectClient | null

  constructor(cfg: UniFiConfig) {
    this.access = new AccessClient(cfg.accessApiUrl, cfg.accessApiToken)
    this.network = new NetworkClient(cfg.consoleUrl, cfg.networkApiKey, cfg.networkSiteId)
    this.protect = cfg.protectApiKey ? new ProtectClient(cfg.consoleUrl, cfg.protectApiKey) : null
  }

  listDoorGroups(): Promise<DoorGroup[]> {
    return this.access.listDoorGroups()
  }

  async provisionAccess(input: ProvisionAccessInput): Promise<ProvisionAccessResult> {
    const accessUserId = await this.access.createUser({ fullName: input.fullName, email: input.email })
    await this.access.setUserPin(accessUserId, input.pin)
    await this.access.assignResources(accessUserId, input.doorGroupIds)
    return { accessUserId }
  }

  async revokeAccess(accessUserId: string): Promise<void> {
    await this.access.deleteUser(accessUserId)
  }

  async setWifiPassword(input: SetWifiInput): Promise<SetWifiResult> {
    if (input.wifiNetworkId) {
      await this.network.updateWifiPassword(input.wifiNetworkId, input.password)
      return { wifiNetworkId: input.wifiNetworkId }
    }
    const wifiNetworkId = await this.network.createWifi({
      ssid: input.ssid,
      password: input.password,
      vlanId: input.vlanId ?? null,
    })
    return { wifiNetworkId }
  }

  cameraSnapshotUrl(cameraId: string | null | undefined): string | null {
    return cameraId && this.protect ? this.protect.snapshotUrl(cameraId) : null
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

  async provisionAccess(_input: ProvisionAccessInput): Promise<ProvisionAccessResult> {
    return { accessUserId: `dryrun-user-${randomUUID().slice(0, 8)}` }
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
}

/** Returns the live provider when fully configured, otherwise the dry-run one. */
export function getUniFiProvider(): UniFiProvider {
  const cfg = readUniFiConfig()
  if (isUniFiLive() && cfg) return new LiveUniFiProvider(cfg)
  return new DryRunUniFiProvider()
}
