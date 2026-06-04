import type { UniFiMode } from './types'

// UniFi connection config. Secrets come from env vars only.
//
//   UNIFI_CONSOLE_URL        e.g. https://67.253.65.134  (WAN IP or hostname)
//   UNIFI_API_KEY            Integrations key (Network + Protect). Also reused as
//                            the Access token unless UNIFI_ACCESS_API_TOKEN is set.
//   UNIFI_ACCESS_API_TOKEN   optional separate Access token (Bearer, :12445)
//   UNIFI_ACCESS_API_URL     optional; defaults to <console host>:12445
//   UNIFI_SITE_ID            optional Network site UUID; auto-resolved via GET /sites
//   UNIFI_INSECURE_TLS=true  skip TLS verification (auto-on when the host is a raw IP)
//   UNIFI_DRY_RUN=true       force simulation even with creds present

export type UniFiConfig = {
  consoleUrl: string
  apiKey: string
  accessApiUrl: string
  accessApiToken: string
  networkSiteId?: string
  insecureTls: boolean
}

const trimSlash = (u: string) => u.replace(/\/+$/, '')
const hostOf = (u: string) => {
  try { return new URL(u).hostname } catch { return '' }
}
const isIp = (h: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h)
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
    // Single-key consoles: reuse the Integrations key as the Access Bearer token.
    accessApiToken: process.env.UNIFI_ACCESS_API_TOKEN?.trim() || apiKey,
    networkSiteId: process.env.UNIFI_SITE_ID?.trim() || undefined,
    insecureTls: process.env.UNIFI_INSECURE_TLS === 'true' || isIp(hostOf(consoleUrl)),
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
