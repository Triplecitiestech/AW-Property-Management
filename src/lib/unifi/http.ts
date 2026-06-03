// Minimal JSON HTTP helper shared by the UniFi clients.
//
// TLS: with the chosen "remote access" model the console presents a valid
// certificate, so default verification applies. For direct local-IP access to a
// self-signed console, set NODE_TLS_REJECT_UNAUTHORIZED=0 at the platform level.

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
}

export async function unifiRequest<T>(req: UniFiRequest): Promise<T> {
  const method = req.method ?? 'GET'
  const hasBody = req.body !== undefined
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(req.headers ?? {}),
  }

  const res = await fetch(`${req.baseUrl}${req.path}`, {
    method,
    headers,
    body: hasBody ? JSON.stringify(req.body) : undefined,
  })

  const text = await res.text()
  if (!res.ok) {
    throw new UniFiHttpError(res.status, `UniFi ${method} ${req.path} failed (${res.status})`, text)
  }
  return (text ? (JSON.parse(text) as T) : ({} as T))
}
