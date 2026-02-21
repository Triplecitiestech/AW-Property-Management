# Email Setup — Resend

This app uses [Resend](https://resend.com) for transactional emails:
- Guest link delivery
- New ticket notifications
- Ticket status change notifications
- Guest report submission alerts

## 1. Create a Resend Account

1. Go to [resend.com](https://resend.com) and sign up for a free account.
2. The free tier allows 100 emails/day and 3,000/month — sufficient for a small property operation.

## 2. Add and Verify Your Domain

1. In the Resend dashboard, go to **Domains** → **Add Domain**.
2. Enter your domain (e.g. `yourdomain.com`).
3. Add the DNS records shown (SPF, DKIM, DMARC) to your domain registrar.
4. Wait for verification (usually 5-30 minutes).

> **For testing:** Resend provides a test domain `@resend.dev` that works without domain verification. Use `onboarding@resend.dev` as the FROM address for local development.

## 3. Create an API Key

1. In Resend dashboard, go to **API Keys** → **Create API Key**.
2. Name it (e.g. "AW Property Management"), set permission to **Sending access**.
3. Copy the key — it starts with `re_`.
4. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_your_key_here
   ```

## 4. Configure Environment Variables

```env
# Email the app sends FROM (must be on your verified domain)
RESEND_FROM_EMAIL=notifications@yourdomain.com

# Comma-separated list of emails to receive owner/manager notifications
NOTIFY_EMAIL=owner@yourdomain.com,manager@yourdomain.com
```

For local development, you can use Resend's test address:
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
NOTIFY_EMAIL=your-personal-email@gmail.com
```

## 5. Test Email Sending

After setting up, create a ticket in the app and check if you receive a notification email. If not:

1. Check the Resend dashboard → **Logs** to see if the email was sent.
2. Check your spam folder.
3. Verify your `NOTIFY_EMAIL` is correct in `.env.local`.
4. Check server logs for any Resend API errors.

## Email Templates

All email templates are defined in `src/lib/email/resend.ts`. They use simple inline HTML with responsive design.

To customize templates, edit the template functions at the bottom of that file.

## Assignee Notifications

When a ticket is assigned to a team member, they receive an email notification if:
1. Their email is in the `profiles` table (stored from auth.users on signup).
2. The `RESEND_API_KEY` is configured.

To ensure assignee emails work, team members should sign up via the app rather than being created directly in Supabase Auth dashboard. Their email is captured automatically on signup.

## Troubleshooting

- **Emails not sending:** Check `RESEND_API_KEY` is set correctly (no extra spaces).
- **Domain not verified:** Use `onboarding@resend.dev` as FROM temporarily.
- **Rate limits:** Free tier is 100/day. For higher volume, upgrade Resend plan.
