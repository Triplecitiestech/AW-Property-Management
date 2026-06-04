// Shared domain types for the UniFi integration.

export type UniFiMode = 'live' | 'dry-run'

export type Door = { id: string; name: string; type?: string }
export type DoorGroup = { id: string; name: string }
export type WifiNetwork = { id: string; name: string; enabled?: boolean; vlanId?: number | null }
export type Camera = { id: string; name: string }

export type ProvisionAccessInput = {
  fullName: string
  email: string
  /** Suggested PIN (used in dry-run; live prefers an Access-generated PIN). */
  pin: string
  /** UniFi Access policy IDs granting the tenant the front intercom + back door. */
  accessPolicyIds: string[]
  validFrom?: string | null
  validUntil?: string | null
}
export type ProvisionAccessResult = { accessUserId: string; pin: string }

export type SetWifiInput = {
  ssid: string
  password: string
  /** Existing wifi-broadcast id to update; if absent, the apartment SSID is created. */
  wifiNetworkId?: string | null
  vlanId?: number | null
}
export type SetWifiResult = { wifiNetworkId: string }

/** Result of probing one UniFi system during discovery. */
export type SystemDiscovery<T> = { ok: true; data: T } | { ok: false; error: string }

/** What the "Test & Discover" probe returns — what works + the IDs to map. */
export type UniFiDiscovery = {
  mode: UniFiMode
  network: SystemDiscovery<{ siteId: string; wifi: WifiNetwork[] }>
  protect: SystemDiscovery<{ cameras: Camera[] }>
  access: SystemDiscovery<{ doorGroups: DoorGroup[]; accessPolicies: { id: string; name: string }[] }>
}

/**
 * A UniFi provider performs the raw controller operations. Two implementations
 * exist: a live HTTP one and a dry-run one used when no controller is configured.
 */
export interface UniFiProvider {
  readonly mode: UniFiMode
  listDoorGroups(): Promise<DoorGroup[]>
  provisionAccess(input: ProvisionAccessInput): Promise<ProvisionAccessResult>
  revokeAccess(accessUserId: string): Promise<void>
  setWifiPassword(input: SetWifiInput): Promise<SetWifiResult>
  /** Returns a URL for a camera snapshot, or null if Protect isn't configured. */
  cameraSnapshotUrl(cameraId: string | null | undefined): string | null
  /** Probe each system and report what authenticates + the IDs available to map. */
  discover(): Promise<UniFiDiscovery>
}
