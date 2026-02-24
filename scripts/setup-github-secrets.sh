#!/usr/bin/env bash
# =============================================================================
# setup-github-secrets.sh
#
# Run this ONCE from your local machine (not this Claude session) to push all
# credentials into GitHub Actions secrets so the CI/CD workflows can run.
#
# Prerequisites:
#   1. Install the GitHub CLI:  https://cli.github.com
#   2. Authenticate:            gh auth login
#   3. Have .env.local present in the project root
#
# Usage:
#   cd /path/to/AW-Property-Management
#   bash scripts/setup-github-secrets.sh
# =============================================================================
set -euo pipefail

REPO="Triplecitiestech/AW-Property-Management"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env.local"

echo "========================================"
echo " GitHub Secrets Setup"
echo " Repo: $REPO"
echo "========================================"
echo ""

# ── Check prerequisites ─────────────────────────────────────────────────────

if ! command -v gh &>/dev/null; then
  echo "ERROR: GitHub CLI (gh) not found."
  echo "Install it from: https://cli.github.com"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "ERROR: Not authenticated. Run: gh auth login"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found."
  exit 1
fi

# ── Load .env.local ──────────────────────────────────────────────────────────

# shellcheck disable=SC1090
set -o allexport
source "$ENV_FILE"
set +o allexport

# ── Helper ───────────────────────────────────────────────────────────────────

set_secret() {
  local name="$1"
  local value="${2:-}"
  if [ -z "$value" ]; then
    echo "  SKIP  $name (not set in .env.local)"
    return
  fi
  printf '%s' "$value" | gh secret set "$name" --repo "$REPO"
  echo "  SET   $name"
}

# ── Set secrets from .env.local ──────────────────────────────────────────────

echo "Setting secrets from .env.local..."
echo ""

set_secret "VERCEL_TOKEN"                  "${VERCEL_TOKEN:-}"
set_secret "NEXT_PUBLIC_SUPABASE_URL"      "${NEXT_PUBLIC_SUPABASE_URL:-}"
set_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
set_secret "SUPABASE_SERVICE_ROLE_KEY"     "${SUPABASE_SERVICE_ROLE_KEY:-}"
set_secret "NEXT_PUBLIC_APP_URL"           "${NEXT_PUBLIC_APP_URL:-}"
set_secret "RESEND_API_KEY"                "${RESEND_API_KEY:-}"
set_secret "RESEND_FROM_EMAIL"             "${RESEND_FROM_EMAIL:-}"
set_secret "NOTIFY_EMAIL"                  "${NOTIFY_EMAIL:-}"
set_secret "TWILIO_ACCOUNT_SID"            "${TWILIO_ACCOUNT_SID:-}"
set_secret "TWILIO_AUTH_TOKEN"             "${TWILIO_AUTH_TOKEN:-}"
set_secret "TWILIO_PHONE_NUMBER"           "${TWILIO_PHONE_NUMBER:-}"

# ── Supabase Access Token (for migrations) ───────────────────────────────────

echo ""
if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  set_secret "SUPABASE_ACCESS_TOKEN" "$SUPABASE_ACCESS_TOKEN"
else
  echo "--- Supabase Personal Access Token ---"
  echo "This is needed to run database migrations (different from the service role key)."
  echo "Get it at: https://supabase.com/dashboard/account/tokens"
  echo "  1. Click 'Generate new token'"
  echo "  2. Name it anything (e.g. 'CI migrations')"
  echo "  3. Copy the token and paste it below"
  echo ""
  read -rsp "SUPABASE_ACCESS_TOKEN: " SUPABASE_ACCESS_TOKEN_INPUT
  echo ""
  if [ -n "$SUPABASE_ACCESS_TOKEN_INPUT" ]; then
    printf '%s' "$SUPABASE_ACCESS_TOKEN_INPUT" | gh secret set "SUPABASE_ACCESS_TOKEN" --repo "$REPO"
    echo "  SET   SUPABASE_ACCESS_TOKEN"
    # Also save it to .env.local for future runs
    echo "" >> "$ENV_FILE"
    echo "SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN_INPUT" >> "$ENV_FILE"
    echo "  (Saved to .env.local for future runs)"
  else
    echo "  SKIP  SUPABASE_ACCESS_TOKEN (empty — migration workflow will fail)"
  fi
fi

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "========================================"
echo " All secrets set!"
echo "========================================"
echo ""
echo "Next: run these commands to trigger the automation:"
echo ""
echo "  # 1. Set Vercel environment variables"
echo "  gh workflow run setup-vercel-env.yml --repo $REPO"
echo ""
echo "  # 2. Run Supabase migration"
echo "  gh workflow run migrate.yml --repo $REPO --field confirm=migrate"
echo ""
echo "  # 3. Merge branch and deploy"
echo "  gh pr create --repo $REPO --base main --head claude/multi-agent-workflow-setup-hU5iv \\"
echo "    --title 'Multi-tenant setup + CI/CD automation' --body 'Automated by Claude Code'"
echo ""
