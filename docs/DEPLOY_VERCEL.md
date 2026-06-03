# Deploy to Vercel

## Prerequisites

- Supabase project set up (see `docs/SUPABASE_SETUP.md`)
- Resend account set up (see `docs/EMAIL_SETUP_RESEND.md`)
- GitHub account with this repo pushed

## Step 1: Push to GitHub

If not already done:
```bash
git remote add origin https://github.com/your-username/aw-property-management.git
git push -u origin main
```

## Step 2: Create a Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New** → **Project**.
3. Import your GitHub repository.
4. Vercel auto-detects Next.js — click **Deploy** once.

## Step 3: Add Environment Variables

In the Vercel project dashboard → **Settings** → **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (keep secret) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL (e.g. `https://aw-properties.vercel.app`) |
| `RESEND_API_KEY` | Your Resend API key |
| `RESEND_FROM_EMAIL` | Your verified sending email |
| `NOTIFY_EMAIL` | Comma-separated notification emails |
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token (keep secret) |
| `TWILIO_PHONE_NUMBER` | Your Twilio number (E.164, e.g. `+12025551234`) |

## Step 4: Redeploy

After adding environment variables:
1. Go to **Deployments** → click the latest deployment → **Redeploy**.
2. Wait for the build to complete.

## Step 5: Update Supabase Auth URLs

1. In Supabase → **Authentication** → **URL Configuration**:
   - **Site URL**: `https://your-vercel-app.vercel.app`
   - **Redirect URLs**: Add `https://your-vercel-app.vercel.app/auth/callback`

## Step 6: Configure the Twilio SMS Webhook

Now that your app is live, point your Twilio number at it. In the Twilio Console →
**Phone Numbers** → your number → **Messaging**:

- Set **"A message comes in"** to **Webhook**.
- URL: `https://your-vercel-app.vercel.app/api/webhooks/sms`
- Method: **HTTP POST**

See `docs/SMS_SETUP.md` for the full walkthrough.

## Step 7: Verify Deployment

1. Visit your Vercel URL → should redirect to login page.
2. Sign in with your account.
3. Check the dashboard loads correctly.
4. Text a command to your Twilio number to verify SMS replies work.

## Custom Domain (Optional)

1. In Vercel → **Settings** → **Domains** → add your domain.
2. Update your DNS records as instructed.
3. Update `NEXT_PUBLIC_APP_URL` to your custom domain.
4. Update Supabase Auth redirect URLs.
5. Update the Twilio messaging webhook to the new URL.

## Automatic Deployments

Vercel automatically deploys when you push to your main branch on GitHub. Each push creates a new deployment with zero downtime.

## Environment-Specific Settings

For staging/preview deployments, Vercel creates unique URLs per branch. You can add environment variables scoped to "Preview" vs "Production" in the Vercel dashboard.

## Monitoring

- **Vercel dashboard**: Real-time deployment logs, function logs.
- **Supabase dashboard**: Database queries, auth events.
- **Resend dashboard**: Email delivery logs.

## Troubleshooting

- **Build fails**: Check Vercel build logs for TypeScript errors. Run `npm run build` locally first.
- **"Function execution failed"**: Check Vercel function logs — usually a missing environment variable.
- **Auth not working after deploy**: Verify Supabase redirect URLs include your Vercel domain.
- **SMS not replying**: Verify the Twilio messaging webhook points to `<APP_URL>/api/webhooks/sms` and that `TWILIO_AUTH_TOKEN` is set.
