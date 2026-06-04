import type { UniFiMode } from './types'

// UniFi connection config. Secrets come from env vars only.
//
// Connectivity: "UniFi remote access" — console reachable over the internet.
// Keys (confirmed against this deployment):
//   UNIFI_API_KEY          ONE console Integration key — covers Network + Protect
//                          (Settings → Control Plane → Integrations). X-API-KEY.
//   UNIFI_ACCESS_API_TOKEN UniFi Access token — SEPARATE, from the Access app
//                          (Bearer, port 12445).
//   UNIFI_CONSOLE_URL      e.g. https://console.example.com
//   UNIFI_SITE_ID          optional Network site UUID; auto-resolved via GET /sites
//   UNIFI_ACCESS_API_URL   optional; defaults to <console host>:12445
//   UNIFI_DRY_RUN=true     force simulation even if creds are present
//
// UNIFI_NETWORK_API_KEY / UNIFI_PROTECT_API_KEY are still accepted as overrides
// but normally you only need the single UNIFI_API_KEY.

export type UniFiConfig = {
  consoleUrl: string
  apiKey: string
  accessApiUrl: string
  accessApiToken: string
  networkSiteId?: string
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
  const apiKey =
    process.env.UNIFI_API_KEY?.trim() ||
    process.env.UNIFI_NETWORK_API_KEY?.trim() ||
    process.env.UNIFI_PROTECT_API_KEY?.trim() ||
    ''
  return {
    consoleUrl: trimSlash(consoleUrl),
    apiKey,
    accessApiUrl: trimSlash(process.env.UNIFI_ACCESS_API_URL?.trim() || deriveAccessUrl(consoleUrl)),
    accessApiToken: process.env.UNIFI_ACCESS_API_TOKEN?.trim() ?? '',
    networkSiteId: process.env.UNIFI_SITE_ID?.trim() || undefined,
  }
}

/** Live mode needs a console URL and the Integration API key. */
export function isUniFiLive(): boolean {
  if (process.env.UNIFI_DRY_RUN === 'true') return false
  const c = readUniFiConfig()
  return !!(c && c.apiKey)
}

export function currentMode(): UniFiMode {
  return isUniFiLive() ? 'live' : 'dry-run'
}
