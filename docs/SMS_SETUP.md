# SMS Setup (Twilio)

The SMS integration lets you manage properties by texting a Twilio phone number —
no need to open the web app for quick updates from your phone.

## What You Can Do

Text these commands to your Twilio number:

**Update property status:**
```
status: Lake Cabin | needs cleaning
status: City Loft | clean
```

**Create a service ticket:**
```
ticket: Lake Cabin | Sink is leaking in kitchen | high
ticket: Mountain Retreat | Replace smoke detector | medium
Create maintenance ticket: heater noise at Lake Cabin, urgent priority
```

**Create a stay:**
```
stay: City Loft | Jordan Smith | 2024-06-01 to 2024-06-07
stay: Lake Cabin | The Johnson Family | tomorrow to 2024-06-10
```

**Get help:**
```
HELP
```

> Only registered users can operate via SMS. The sender's phone number must match
> the `phone_number` on their profile (E.164 format, e.g. `+12025551234`).

## Setup Steps

### Step 1: Create a Twilio Account and Phone Number

1. Sign up at [twilio.com](https://twilio.com).
2. Buy an SMS-capable phone number from the Twilio Console.
3. From the Console dashboard, copy your **Account SID** and **Auth Token**.

### Step 2: Add Credentials to Your Environment

Add to `.env.local` (and to your Vercel project for production):
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token-here
TWILIO_PHONE_NUMBER=+12025551234
```

The `TWILIO_AUTH_TOKEN` is also used to verify the `X-Twilio-Signature` on every
inbound webhook. If it is unset, signature verification is skipped (dev only) —
**always set it in production.**

### Step 3: Deploy Your App

The webhook requires a public HTTPS URL. Deploy to Vercel first
(see `docs/DEPLOY_VERCEL.md`), then continue.

For local testing, use [ngrok](https://ngrok.com):
```bash
ngrok http 3000
# Use the https URL it prints as your APP_URL
```

### Step 4: Configure the Twilio Messaging Webhook

In the Twilio Console → **Phone Numbers** → your number → **Messaging**:

- Set **"A message comes in"** to **Webhook**.
- URL: `<APP_URL>/api/webhooks/sms`
- Method: **HTTP POST**

Save. Twilio will now POST inbound texts to your app, and the app replies with TwiML.

### Step 5: Register Your Phone Number in the App

1. Log in to the web app.
2. Add your mobile number (E.164 format) to your profile.
3. Text `HELP` to your Twilio number — you should receive the command reference.

## Adding Team Members

Any team member with their phone number registered on their profile can use SMS.
The audit log records which user sent each command.

## Troubleshooting

- **"Your number is not registered":** Add your phone number (E.164 format, with `+`
  and country code) to your profile.
- **No reply at all:** Confirm the Messaging webhook URL is correct and uses HTTPS.
- **`401 Unauthorized` in logs:** The `X-Twilio-Signature` failed verification —
  ensure `TWILIO_AUTH_TOKEN` and `NEXT_PUBLIC_APP_URL` match the live deployment.
- **"Property not found":** Check the property name — matching is partial and
  case-insensitive.

## Status Values Reference

| You type | System value |
|----------|-------------|
| `clean` | `clean` |
| `needs cleaning` / `cleaning` | `needs_cleaning` |
| `needs maintenance` / `maintenance` | `needs_maintenance` |
| `needs groceries` / `groceries` | `needs_groceries` |

## Priority Values Reference

| You type | System value |
|----------|-------------|
| `low` | `low` |
| `medium` | `medium` |
| `high` | `high` |
| `urgent` or `critical` | `urgent` |
