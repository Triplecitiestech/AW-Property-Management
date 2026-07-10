/**
 * Sets all required environment variables on the Vercel project.
 * Called from .github/workflows/setup-vercel-env.yml (or run locally).
 *
 * Required env: VERCEL_TOKEN
 * All other vars are read from the process environment.
 */

const TOKEN = process.env.VERCEL_TOKEN;
const TEAM_SLUG = 'Triplecitiestech';
const PROJECT_NAME = 'AW-Property-Management';

if (!TOKEN) {
  console.error('ERROR: VERCEL_TOKEN is required');
  process.exit(1);
}

const ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'NOTIFY_EMAIL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_ID',
  'STRIPE_WEBHOOK_SECRET',
];

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function api(method, path, body) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function getProject() {
  const data = await api('GET', `/v9/projects/${PROJECT_NAME}?teamSlug=${TEAM_SLUG}`);
  return { projectId: data.id, teamId: data.accountId };
}

async function getExistingEnvs(projectId, teamId) {
  const data = await api('GET', `/v10/projects/${projectId}/env?teamId=${teamId}`);
  return data.envs || [];
}

async function upsertEnvVar(projectId, teamId, existing, key, value) {
  if (!value) {
    console.log(`  SKIP  ${key} (no value)`);
    return;
  }

  const existingVar = existing.find((e) => e.key === key);
  if (existingVar) {
    await api('PATCH', `/v10/projects/${projectId}/env/${existingVar.id}?teamId=${teamId}`, {
      value,
      target: ['production', 'preview', 'development'],
    });
    console.log(`  UPDATE ${key}`);
  } else {
    await api('POST', `/v10/projects/${projectId}/env?teamId=${teamId}`, {
      key,
      value,
      type: 'encrypted',
      target: ['production', 'preview', 'development'],
    });
    console.log(`  CREATE ${key}`);
  }
}

async function main() {
  console.log(`Configuring Vercel env vars for: ${TEAM_SLUG}/${PROJECT_NAME}`);

  const { projectId, teamId } = await getProject();
  console.log(`Project ID: ${projectId}  Team ID: ${teamId}\n`);

  const existing = await getExistingEnvs(projectId, teamId);

  for (const key of ENV_VARS) {
    const value = process.env[key];
    await upsertEnvVar(projectId, teamId, existing, key, value);
  }

  console.log('\nDone. All environment variables configured in Vercel.');
  console.log(`View them at: https://vercel.com/${TEAM_SLUG}/${PROJECT_NAME}/settings/environment-variables`);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
