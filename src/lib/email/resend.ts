import { Resend } from 'resend'

// Lazy initialization — only create client when actually sending email
function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

function getFROM() { return process.env.RESEND_FROM_EMAIL ?? 'notifications@yourdomain.com' }
function getAPP_URL() { return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000' }

function getNotifyEmails(): string[] {
  return (process.env.NOTIFY_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean)
}

// ---- Assignee Notification Email ----

export async function sendAssigneeEmail(params: {
  to: string
  assigneeName: string
  ticketId: string
  title: string
  propertyName: string
  category: string
  priority: string
  description?: string
  dueDate?: string
}) {
  const resend = getResend()
  if (!resend) return
  const { to, assigneeName, ticketId, title, propertyName, category, priority, description, dueDate } = params
  const ticketUrl = `${getAPP_URL()}/work-orders/${ticketId}`
  return resend.emails.send({
    from: getFROM(),
    to,
    subject: `You've been assigned: ${title} — ${propertyName}`,
    html: assigneeTemplate({ assigneeName, title, propertyName, category, priority, description, dueDate, ticketUrl }),
  })
}

// ---- Guest Link Email ----

export async function sendGuestLinkEmail(params: {
  to: string
  guestName: string
  propertyName: string
  startDate: string
  endDate: string
  guestLink: string
}) {
  const resend = getResend()
  if (!resend) return
  const { to, guestName, propertyName, startDate, endDate, guestLink } = params
  return resend.emails.send({
    from: getFROM(),
    to,
    subject: `Your stay at ${propertyName} — Check-in Info`,
    html: guestLinkTemplate({ guestName, propertyName, startDate, endDate, guestLink }),
  })
}

// ---- New Ticket Email ----

export async function sendNewTicketEmail(params: {
  ticketId: string
  title: string
  propertyName: string
  category: string
  priority: string
  description?: string
}) {
  const resend = getResend()
  if (!resend) return
  const to = getNotifyEmails()
  if (!to.length) return
  const { ticketId, title, propertyName, category, priority, description } = params
  const ticketUrl = `${getAPP_URL()}/work-orders/${ticketId}`
  return resend.emails.send({
    from: getFROM(),
    to,
    subject: `[${priority.toUpperCase()}] New ticket: ${title} — ${propertyName}`,
    html: newTicketTemplate({ title, propertyName, category, priority, description, ticketUrl }),
  })
}

// ---- Ticket Status Changed Email ----

export async function sendTicketStatusChangedEmail(params: {
  ticketId: string
  title: string
  propertyName: string
  oldStatus: string
  newStatus: string
}) {
  const resend = getResend()
  if (!resend) return
  const to = getNotifyEmails()
  if (!to.length) return
  const { ticketId, title, propertyName, oldStatus, newStatus } = params
  const ticketUrl = `${getAPP_URL()}/work-orders/${ticketId}`
  return resend.emails.send({
    from: getFROM(),
    to,
    subject: `Ticket updated: ${title} — ${propertyName}`,
    html: statusChangedTemplate({ title, propertyName, oldStatus, newStatus, ticketUrl }),
  })
}

// ---- Welcome Email ----

export async function sendWelcomeEmail(params: {
  to: string
  name: string
  twilioPhone: string
}) {
  const resend = getResend()
  if (!resend) return
  const { to, name, twilioPhone } = params
  const appUrl = getAPP_URL()
  return resend.emails.send({
    from: getFROM(),
    to,
    subject: `Welcome to Smart Sumi — your AI property manager is ready 🏠`,
    html: welcomeTemplate({ name, appUrl, twilioPhone }),
  })
}

// ---- Contact Ticket Notification Email (external contact) ----

export async function sendContactTicketEmail(params: {
  to: string
  contactName: string
  ticketId: string
  title: string
  propertyName: string
  category: string
  priority: string
  description?: string
}) {
  const resend = getResend()
  if (!resend) return
  const { to, contactName, ticketId, title, propertyName, category, priority, description } = params
  const ticketUrl = `${getAPP_URL()}/work-orders/${ticketId}`
  return resend.emails.send({
    from: getFROM(),
    to,
    subject: `Service Request: ${title} — ${propertyName}`,
    html: baseLayout(`
      <div class="header"><h1>Service Request</h1><p>${propertyName}</p></div>
      <div class="body">
        <p>Hi <strong>${contactName}</strong>,</p>
        <p>A service request has been assigned to you at <strong>${propertyName}</strong>.</p>
        <p>
          <strong>${title}</strong><br>
          Category: ${category} &nbsp; Priority: <span class="badge badge-${priority}">${priority}</span>
        </p>
        ${description ? `<p>${description}</p>` : ''}
        <p>Please respond as soon as possible or reply to this email to confirm receipt.</p>
        <a class="btn" href="${ticketUrl}">View Details</a>
      </div>`),
  })
}

// ---- Guest Report Submitted Email ----

export async function sendGuestReportEmail(params: {
  stayId: string
  guestName: string
  propertyName: string
  notes?: string
}) {
  const resend = getResend()
  if (!resend) return
  const to = getNotifyEmails()
  if (!to.length) return
  const { stayId, guestName, propertyName, notes } = params
  const stayUrl = `${getAPP_URL()}/stays/${stayId}`
  return resend.emails.send({
    from: getFROM(),
    to,
    subject: `Guest report submitted — ${guestName} at ${propertyName}`,
    html: guestReportTemplate({ guestName, propertyName, notes, stayUrl }),
  })
}

// ============================================================
// Email Templates
// ============================================================

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 32px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .header { background: #1d4ed8; color: white; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .header p { margin: 4px 0 0; font-size: 14px; opacity: 0.85; }
    .body { padding: 32px; }
    .body p { margin: 0 0 16px; color: #374151; line-height: 1.6; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .badge-urgent { background: #fee2e2; color: #991b1b; }
    .badge-high { background: #ffedd5; color: #9a3412; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-low { background: #d1fae5; color: #065f46; }
    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 8px; }
    .footer { padding: 16px 32px; background: #f3f4f6; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">Smart Sumi · <a href="${getAPP_URL()}" style="color:#6b7280;">Open App</a></div>
  </div>
</body>
</html>`
}

function assigneeTemplate(p: { assigneeName: string; title: string; propertyName: string; category: string; priority: string; description?: string; dueDate?: string; ticketUrl: string }) {
  return baseLayout(`
    <div class="header"><h1>New Task Assigned</h1><p>${p.propertyName}</p></div>
    <div class="body">
      <p>Hi <strong>${p.assigneeName}</strong>,</p>
      <p>You've been assigned a new service request at <strong>${p.propertyName}</strong>.</p>
      <p>
        <strong>${p.title}</strong><br>
        Category: ${p.category} &nbsp; Priority: <span class="badge badge-${p.priority}">${p.priority}</span>
        ${p.dueDate ? `<br>Due: <strong>${p.dueDate}</strong>` : ''}
      </p>
      ${p.description ? `<p>${p.description}</p>` : ''}
      <a class="btn" href="${p.ticketUrl}">View Ticket</a>
    </div>`)
}

function guestLinkTemplate(p: { guestName: string; propertyName: string; startDate: string; endDate: string; guestLink: string }) {
  return baseLayout(`
    <div class="header"><h1>Your Stay at ${p.propertyName}</h1><p>${p.startDate} – ${p.endDate}</p></div>
    <div class="body">
      <p>Hi <strong>${p.guestName}</strong>,</p>
      <p>We're excited to host you at <strong>${p.propertyName}</strong> (${p.startDate} – ${p.endDate}).</p>
      <p>Use the link below to access your check-in info, including Wi-Fi details, door codes, and instructions for your stay. You can also use it to reach us if you need anything.</p>
      <a class="btn" href="${p.guestLink}">View Check-in Info</a>
      <p style="margin-top:16px;font-size:13px;color:#6b7280;">Or copy this link: <a href="${p.guestLink}">${p.guestLink}</a></p>
      <p style="font-size:13px;color:#6b7280;">We hope you enjoy your stay!</p>
    </div>`)
}

function newTicketTemplate(p: { title: string; propertyName: string; category: string; priority: string; description?: string; ticketUrl: string }) {
  return baseLayout(`
    <div class="header"><h1>New Service Request</h1><p>${p.propertyName}</p></div>
    <div class="body">
      <p><strong>${p.title}</strong></p>
      <p>
        Category: <strong>${p.category}</strong> &nbsp;
        Priority: <span class="badge badge-${p.priority}">${p.priority}</span>
      </p>
      ${p.description ? `<p>${p.description}</p>` : ''}
      <a class="btn" href="${p.ticketUrl}">View Ticket</a>
    </div>`)
}

function statusChangedTemplate(p: { title: string; propertyName: string; oldStatus: string; newStatus: string; ticketUrl: string }) {
  return baseLayout(`
    <div class="header"><h1>Ticket Status Updated</h1><p>${p.propertyName}</p></div>
    <div class="body">
      <p><strong>${p.title}</strong></p>
      <p>Status changed: <strong>${p.oldStatus}</strong> → <strong>${p.newStatus}</strong></p>
      <a class="btn" href="${p.ticketUrl}">View Ticket</a>
    </div>`)
}

function guestReportTemplate(p: { guestName: string; propertyName: string; notes?: string; stayUrl: string }) {
  return baseLayout(`
    <div class="header"><h1>Guest Report Submitted</h1><p>${p.propertyName}</p></div>
    <div class="body">
      <p><strong>${p.guestName}</strong> has submitted their guest checklist for <strong>${p.propertyName}</strong>.</p>
      ${p.notes ? `<p><strong>Guest notes:</strong> ${p.notes}</p>` : ''}
      <a class="btn" href="${p.stayUrl}">View Stay Details</a>
    </div>`)
}

function welcomeTemplate(p: { name: string; appUrl: string; twilioPhone: string }) {
  const firstName = p.name.split(' ')[0] || p.name
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to Smart Sumi</title>
</head>
<body style="margin:0;padding:0;background:#0f1829;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1829;min-height:100vh;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Logo Header -->
        <tr>
          <td style="padding-bottom:24px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="background:linear-gradient(135deg,#7c3aed,#0d9488);width:52px;height:52px;border-radius:14px;text-align:center;vertical-align:middle;">
                  <span style="font-size:26px;line-height:52px;">🏠</span>
                </td>
                <td style="padding-left:12px;vertical-align:middle;">
                  <span style="font-size:22px;font-weight:700;color:#ffffff;">Smart <span style="color:#2dd4bf;">Sumi</span></span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero Card -->
        <tr>
          <td style="background:linear-gradient(135deg,#4c1d95 0%,#1e3a5f 50%,#0d4744 100%);border-radius:20px 20px 0 0;padding:40px 40px 32px;text-align:center;">
            <p style="margin:0 0 8px;font-size:14px;color:#a78bfa;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Welcome aboard</p>
            <h1 style="margin:0 0 12px;font-size:32px;font-weight:800;color:#ffffff;line-height:1.2;">Hi ${firstName}, you&rsquo;re all set! 🎉</h1>
            <p style="margin:0;font-size:16px;color:#cbd5e1;line-height:1.6;">Your AI-powered property management platform is ready.<br>Here&rsquo;s everything you need to get started.</p>
          </td>
        </tr>

        <!-- Main Content Card -->
        <tr>
          <td style="background:#1a2436;border-radius:0 0 20px 20px;padding:32px 40px 40px;">

            <!-- Feature: Dashboard -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#0f1829;border-radius:12px;padding:20px;border-left:3px solid #7c3aed;">
                  <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#e2e8f0;">📊 Your Dashboard</p>
                  <p style="margin:0 0 12px;font-size:14px;color:#94a3b8;line-height:1.5;">Add properties, track stays and service tickets, manage contacts, and view everything at a glance.</p>
                  <a href="${p.appUrl}/dashboard" style="display:inline-block;padding:8px 20px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">Open Dashboard →</a>
                </td>
              </tr>
            </table>

            <!-- Feature: SMS AI -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#0f1829;border-radius:12px;padding:20px;border-left:3px solid #0d9488;">
                  <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#e2e8f0;">📱 Your AI Property Manager</p>
                  <p style="margin:0 0 12px;font-size:14px;color:#94a3b8;line-height:1.5;">Text your AI at any time to get updates, create tickets, schedule guests, or make changes — no login needed.</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#0d2d2a;border-radius:10px;padding:12px 16px;">
                        <p style="margin:0 0 2px;font-size:11px;color:#2dd4bf;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Your AI&rsquo;s number</p>
                        <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:1px;">${p.twilioPhone}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- SMS Examples -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#0f1829;border-radius:12px;padding:20px;">
                  <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-size:12px;">💬 Things you can text your AI</p>

                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom:8px;">
                        <div style="background:#1a2436;border-radius:8px;padding:10px 14px;">
                          <p style="margin:0 0 2px;font-size:12px;color:#94a3b8;">Check property status</p>
                          <p style="margin:0;font-size:13px;color:#e2e8f0;font-family:monospace;">&ldquo;What&rsquo;s the status of Lake Cabin?&rdquo;</p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:8px;">
                        <div style="background:#1a2436;border-radius:8px;padding:10px 14px;">
                          <p style="margin:0 0 2px;font-size:12px;color:#94a3b8;">Create a service request</p>
                          <p style="margin:0;font-size:13px;color:#e2e8f0;font-family:monospace;">&ldquo;Leaking faucet at City Loft, high priority&rdquo;</p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:8px;">
                        <div style="background:#1a2436;border-radius:8px;padding:10px 14px;">
                          <p style="margin:0 0 2px;font-size:12px;color:#94a3b8;">Schedule a guest stay</p>
                          <p style="margin:0;font-size:13px;color:#e2e8f0;font-family:monospace;">&ldquo;Book Sarah Johnson at Mountain Retreat June 10–17&rdquo;</p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:8px;">
                        <div style="background:#1a2436;border-radius:8px;padding:10px 14px;">
                          <p style="margin:0 0 2px;font-size:12px;color:#94a3b8;">Add a contact</p>
                          <p style="margin:0;font-size:13px;color:#e2e8f0;font-family:monospace;">&ldquo;Add Mike&rsquo;s Plumbing as the plumber for Lake Cabin, 555-0100&rdquo;</p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div style="background:#1a2436;border-radius:8px;padding:10px 14px;">
                          <p style="margin:0 0 2px;font-size:12px;color:#94a3b8;">Get all open tickets</p>
                          <p style="margin:0;font-size:13px;color:#e2e8f0;font-family:monospace;">&ldquo;Show me all open tickets&rdquo;</p>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Getting Started Steps -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#0f1829;border-radius:12px;padding:20px;">
                  <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">🚀 Getting started</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;vertical-align:top;">
                        <span style="display:inline-block;width:22px;height:22px;background:#7c3aed;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#fff;margin-right:10px;">1</span>
                        <span style="font-size:14px;color:#cbd5e1;">Add your first property in the <a href="${p.appUrl}/properties/new" style="color:#a78bfa;text-decoration:none;">Properties</a> section</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;vertical-align:top;">
                        <span style="display:inline-block;width:22px;height:22px;background:#7c3aed;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#fff;margin-right:10px;">2</span>
                        <span style="font-size:14px;color:#cbd5e1;">Add contacts (cleaner, maintenance, etc.) during property setup</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;vertical-align:top;">
                        <span style="display:inline-block;width:22px;height:22px;background:#7c3aed;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#fff;margin-right:10px;">3</span>
                        <span style="font-size:14px;color:#cbd5e1;">Save <strong style="color:#2dd4bf;">${p.twilioPhone}</strong> in your contacts as &ldquo;Smart Sumi AI&rdquo;</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;vertical-align:top;">
                        <span style="display:inline-block;width:22px;height:22px;background:#7c3aed;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#fff;margin-right:10px;">4</span>
                        <span style="font-size:14px;color:#cbd5e1;">Text &ldquo;Hello&rdquo; to your AI to see what it can do</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Support -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#0f1829;border-radius:12px;padding:20px;text-align:center;">
                  <p style="margin:0 0 4px;font-size:14px;color:#94a3b8;">Need help? Our support team (AI-powered) is here 24/7</p>
                  <a href="mailto:support@smartsumai.com" style="font-size:16px;font-weight:700;color:#2dd4bf;text-decoration:none;">support@smartsumai.com</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#4a6080;">Smart Sumi · AI-Powered Property Management</p>
            <p style="margin:4px 0 0;font-size:12px;color:#4a6080;">
              <a href="${p.appUrl}" style="color:#6480a0;text-decoration:none;">Dashboard</a> &nbsp;·&nbsp;
              <a href="mailto:support@smartsumai.com" style="color:#6480a0;text-decoration:none;">Support</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
