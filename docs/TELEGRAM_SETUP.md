# Telegram Bot Setup

The Telegram bot lets you manage properties by sending text messages from your phone — no need to open the web app for quick updates.

## What the Bot Can Do

Send plain text messages to the bot:

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
/help
```

## Setup Steps

### Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**.
2. Send `/newbot`.
3. Choose a name (e.g. "AW Property Bot").
4. Choose a username (e.g. `AWPropertyBot` — must end in `bot`).
5. BotFather will give you a token like: `1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ`
6. Add to `.env.local`:
   ```
   TELEGRAM_BOT_TOKEN=your_token_here
   ```

### Step 2: Generate a Webhook Secret

Generate a random secret to secure the webhook:
```bash
openssl rand -hex 32
```
Or use any random string. Add to `.env.local`:
```
TELEGRAM_WEBHOOK_SECRET=your_random_secret_here
```

### Step 3: Deploy Your App

The Telegram webhook requires a public HTTPS URL. Deploy to Vercel first (see `docs/DEPLOY_VERCEL.md`), then come back here.

For local testing, use [ngrok](https://ngrok.com):
```bash
ngrok http 3000
# Use the https URL provided
```

### Step 4: Register the Webhook with Telegram

Replace `<BOT_TOKEN>`, `<APP_URL>`, and `<WEBHOOK_SECRET>` with your values:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "<APP_URL>/api/webhooks/telegram",
    "secret_token": "<WEBHOOK_SECRET>",
    "allowed_updates": ["message"]
  }'
```

Expected response:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### Step 5: Verify Webhook

Check webhook status:
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

### Step 6: Test the Bot

1. Open Telegram and find your bot by its username.
2. Send `/start` — you should get a welcome message.
3. Try a command:
   ```
   status: Lake Cabin | needs cleaning
   ```
4. Check the Supabase dashboard to confirm the property status was updated.

## Adding Team Members

Any team member can use the Telegram bot — just share the bot username with them. They can send the same commands.

For more control (e.g., knowing which team member sent a command), the audit log records the Telegram sender's first name.

## Troubleshooting

- **Bot not responding:** Verify the webhook URL is accessible (HTTPS required).
- **"Property not found" error:** Check the property name spelling — the bot does a partial match (case-insensitive).
- **Webhook not set:** Run the `setWebhook` curl command again.
- **403 Unauthorized:** Verify `TELEGRAM_WEBHOOK_SECRET` matches what you set in the webhook registration.

## Status Values Reference

| You type | System value |
|----------|-------------|
| `clean` | `clean` |
| `needs cleaning` | `needs_cleaning` |
| `cleaning` | `needs_cleaning` |
| `needs maintenance` | `needs_maintenance` |
| `maintenance` | `needs_maintenance` |
| `needs groceries` | `needs_groceries` |
| `groceries` | `needs_groceries` |

## Priority Values Reference

| You type | System value |
|----------|-------------|
| `low` | `low` |
| `medium` | `medium` |
| `high` | `high` |
| `urgent` or `critical` | `urgent` |
