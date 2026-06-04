import * as https from 'node:https'

// Minimal JSON HTTP helper shared by the UniFi clients.
//
// TLS: the Network/Protect Integration API (console, 443) presents a valid cert,
// so it goes over global fetch. The UniFi Access API (:12445) uses a SELF-SIGNED
// cert, so those requests pass `insecure: true` and are made via node:https with
// rejectUnauthorized disabled (scoped to that single request).

export class UniFiHttpError extends Error {
  constructor(public status: number, message: string, public body?: string) {
    super(message)
    this.name = 'UniFiHttpError'
  }
}

export type UniFiRequest = {
  baseUrl: string
  path: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  /** Allow a self-signed TLS certificate (UniFi Access on :12445). */
  insecure?: boolean
}

type RawResponse = { status: number; ok: boolean; text: string }

async function viaFetch(url: string, method: string, headers: Record<string, string>, payload?: string): Promise<RawResponse> {
  const res = await fetch(url, { method, headers, body: payload })
  return { status: res.status, ok: res.ok, text: await res.text() }
}

function viaInsecureHttps(url: string, method: string, headers: Record<string, string>, payload?: string): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = https.request(
      {
        method,
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        headers: { ...headers, ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}) },
        rejectUnauthorized: false,
      },
      (resp) => {
        const status = resp.statusCode ?? 0
        let text = ''
        resp.setEncoding('utf8')
        resp.on('data', (chunk) => (text += chunk))
        resp.on('end', () => resolve({ status, ok: status >= 200 && status < 300, text }))
      },
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

export async function unifiRequest<T>(req: UniFiRequest): Promise<T> {
  const method = req.method ?? 'GET'
  const hasBody = req.body !== undefined
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(req.headers ?? {}),
  }
  const url = `${req.baseUrl}${req.path}`
  const payload = hasBody ? JSON.stringify(req.body) : undefined

  const res = req.insecure
    ? await viaInsecureHttps(url, method, headers, payload)
    : await viaFetch(url, method, headers, payload)

  if (!res.ok) {
    throw new UniFiHttpError(res.status, `UniFi ${method} ${req.path} failed (${res.status})`, res.text)
  }
  return (res.text ? (JSON.parse(res.text) as T) : ({} as T))
}
