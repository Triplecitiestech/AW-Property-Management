import type { UniFiMode } from './types'

// UniFi connection config. Secrets come from env vars only.
//
// Connectivity model (chosen): "UniFi remote access" — the console is reachable
// over the internet (valid TLS cert) and we authenticate with per-app API keys.
//   UNIFI_CONSOLE_URL        e.g. https://console.example.com
//   UNIFI_NETWORK_API_KEY    Network Integration API key  (X-API-KEY)
//   UNIFI_ACCESS_API_URL     optional; defaults to <console host>:12445
//   UNIFI_ACCESS_API_TOKEN   UniFi Access developer API token (Bearer)
//   UNIFI_PROTECT_API_KEY    UniFi Protect integration API key (X-API-KEY)
//   UNIFI_SITE_ID            Network site id (default "default")
//   UNIFI_DRY_RUN=true       force simulation even if creds are present

export type UniFiConfig = {
  consoleUrl: string
  networkApiKey: string
  accessApiUrl: string
  accessApiToken: string
  protectApiKey: string
  networkSiteId: string
}

const trimSlash = (u: string) => u.replace(/\/+$/, '')

function deriveAccessUrl(consoleUrl: string): string {
  try {
    const u = new URL(consoleUrl)
    return `${u.protocol}//${u.hostname}:12445`
  } catch {
    return consoleUrl
  }
}

export function readUniFiConfig(): UniFiConfig | null {
  const consoleUrl = process.env.UNIFI_CONSOLE_URL?.trim()
  if (!consoleUrl) return null
  return {
    consoleUrl: trimSlash(consoleUrl),
    networkApiKey: process.env.UNIFI_NETWORK_API_KEY?.trim() ?? '',
    accessApiUrl: trimSlash(process.env.UNIFI_ACCESS_API_URL?.trim() || deriveAccessUrl(consoleUrl)),
    accessApiToken: process.env.UNIFI_ACCESS_API_TOKEN?.trim() ?? '',
    protectApiKey: process.env.UNIFI_PROTECT_API_KEY?.trim() ?? '',
    networkSiteId: process.env.UNIFI_SITE_ID?.trim() || 'default',
  }
}

/** Live mode needs a console URL plus the Access token and Network key. */
export function isUniFiLive(): boolean {
  if (process.env.UNIFI_DRY_RUN === 'true') return false
  const c = readUniFiConfig()
  return !!(c && c.networkApiKey && c.accessApiToken)
}

export function currentMode(): UniFiMode {
  return isUniFiLive() ? 'live' : 'dry-run'
}
