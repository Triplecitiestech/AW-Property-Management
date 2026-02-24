/**
 * Runs the multi-tenant migration against Supabase using the Management API.
 * Requires SUPABASE_ACCESS_TOKEN (personal access token from supabase.com/dashboard/account/tokens).
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'ilooxnlkovwbxymwieaj';

if (!TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN is required.');
  console.error('Get one at: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const migrationSQL = readFileSync(
  join(__dirname, '../supabase/migrations/20260221_multi_tenant.sql'),
  'utf-8'
);

async function runSQL(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log(`Running migration on project: ${PROJECT_REF}`);

  // Split the migration into individual statements so we get per-statement errors
  // Filter out empty statements and comments-only blocks
  const statements = migrationSQL
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--'));

  let succeeded = 0;
  let skipped = 0;

  for (const stmt of statements) {
    if (!stmt) continue;
    const preview = stmt.slice(0, 60).replace(/\n/g, ' ');
    try {
      await runSQL(stmt + ';');
      console.log(`  OK: ${preview}…`);
      succeeded++;
    } catch (err) {
      const msg = err.message;
      // These are all safe "already exists" conditions — migration is idempotent
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate key') ||
        msg.includes('already an attribute') ||
        msg.includes('invalid input value for enum') // ADD VALUE IF NOT EXISTS already added
      ) {
        console.log(`  SKIP (already applied): ${preview}…`);
        skipped++;
      } else {
        console.error(`  FAIL: ${preview}…`);
        console.error(`        ${msg}`);
        process.exit(1);
      }
    }
  }

  console.log(`\nMigration complete: ${succeeded} applied, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
