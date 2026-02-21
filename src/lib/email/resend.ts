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
  const ticketUrl = `${getAPP_URL()}/tickets/${ticketId}`
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
    subject: `Your stay at ${propertyName} — Guest Checklist`,
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
  const ticketUrl = `${getAPP_URL()}/tickets/${ticketId}`
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
  const ticketUrl = `${getAPP_URL()}/tickets/${ticketId}`
  return resend.emails.send({
    from: getFROM(),
    to,
    subject: `Ticket updated: ${title} — ${propertyName}`,
    html: statusChangedTemplate({ title, propertyName, oldStatus, newStatus, ticketUrl }),
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
    <div class="footer">AW Property Management · <a href="${getAPP_URL()}" style="color:#6b7280;">Open App</a></div>
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
    <div class="header"><h1>Your Stay Details</h1><p>${p.propertyName}</p></div>
    <div class="body">
      <p>Hi <strong>${p.guestName}</strong>,</p>
      <p>Thank you for your upcoming stay at <strong>${p.propertyName}</strong> (${p.startDate} – ${p.endDate}).</p>
      <p>Please use the link below to access your guest checklist. You can report any issues or leave notes for the host.</p>
      <a class="btn" href="${p.guestLink}">Open Guest Checklist</a>
      <p style="margin-top:16px;font-size:13px;color:#6b7280;">Or copy this link: <a href="${p.guestLink}">${p.guestLink}</a></p>
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
