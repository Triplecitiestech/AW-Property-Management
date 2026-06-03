import { Resend } from 'resend'

// Tenant onboarding/offboarding emails for the UniFi integration.
// Lazily initialized so the app runs without a Resend key (emails are skipped).

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}
const getFrom = () => process.env.RESEND_FROM_EMAIL ?? 'notifications@yourdomain.com'

function layout(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f6fb;margin:0;padding:0;color:#1f2937}
    .container{max-width:560px;margin:28px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}
    .header{background:#4f46e5;color:#fff;padding:24px 32px}.header h1{margin:0;font-size:20px}
    .body{padding:28px 32px}.body p{line-height:1.6;margin:0 0 14px}
    .card{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;background:#fafafe}
    .label{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;margin:0 0 2px}
    .value{font-size:20px;font-weight:700;font-family:ui-monospace,Menlo,monospace;margin:0 0 12px;color:#111827}
    .muted{color:#6b7280;font-size:13px}.footer{padding:16px 32px;background:#f3f4f6;font-size:12px;color:#9ca3af}
  </style></head><body><div class="container">${content}
    <div class="footer">Sent by AW Property Management</div></div></body></html>`
}

export type TenantWelcomeParams = {
  to: string
  tenantName: string
  buildingName: string
  address?: string | null
  unitLabel: string
  moveIn?: string | null
  moveOut?: string | null
  wifiSsid: string
  wifiPassword: string
  doorPin: string
  wantsNfc: boolean
}

export async function sendTenantWelcomeEmail(p: TenantWelcomeParams): Promise<{ sent: boolean }> {
  const resend = getResend()
  if (!resend) return { sent: false }
  const stay = [p.moveIn, p.moveOut].filter(Boolean).join(' – ')
  await resend.emails.send({
    from: getFrom(),
    to: p.to,
    subject: `Welcome to ${p.buildingName} — ${p.unitLabel}`,
    html: layout(`
      <div class="header"><h1>Welcome home, ${p.tenantName.split(' ')[0]} 👋</h1></div>
      <div class="body">
        <p>You're all set at <strong>${p.buildingName}</strong>${p.address ? `, ${p.address}` : ''} — unit <strong>${p.unitLabel}</strong>${stay ? ` (${stay})` : ''}. Here's everything you need.</p>

        <div class="card">
          <p class="label">Wi-Fi network (your apartment)</p>
          <p class="value">${p.wifiSsid}</p>
          <p class="label">Wi-Fi password</p>
          <p class="value">${p.wifiPassword}</p>
        </div>

        <div class="card">
          <p class="label">Door PIN (front intercom &amp; back door)</p>
          <p class="value">${p.doorPin}</p>
          <p class="muted">Enter this PIN on the keypad at the front intercom or the back door to unlock.</p>
        </div>

        <p><strong>Prefer to tap in?</strong> ${p.wantsNfc
          ? `We've noted you'd like an NFC key card — the building manager will have it ready for you to pick up and activate.`
          : `If you'd like a tap-to-enter NFC key card, just reply to this email and we'll set one up for you.`}</p>

        <p><strong>No card, no PIN?</strong> Press the <em>ring</em> button on the front intercom — if a building manager is available, they'll let you in.</p>

        <p class="muted">Keep this email handy. If anything doesn't work, just reply and we'll help.</p>
      </div>`),
  })
  return { sent: true }
}

export type TenantOffboardingParams = {
  to: string
  tenantName: string
  buildingName: string
  unitLabel: string
}

export async function sendTenantOffboardingEmail(p: TenantOffboardingParams): Promise<{ sent: boolean }> {
  const resend = getResend()
  if (!resend) return { sent: false }
  await resend.emails.send({
    from: getFrom(),
    to: p.to,
    subject: `Your access at ${p.buildingName} has ended`,
    html: layout(`
      <div class="header"><h1>Thanks for staying with us</h1></div>
      <div class="body">
        <p>Hi ${p.tenantName.split(' ')[0]},</p>
        <p>Your access to <strong>${p.buildingName}</strong> — unit <strong>${p.unitLabel}</strong> has now been deactivated. Your door PIN and Wi-Fi password no longer work.</p>
        <p>We hope you enjoyed your stay. If you left anything behind or need anything else, just reply to this email.</p>
      </div>`),
  })
  return { sent: true }
}
