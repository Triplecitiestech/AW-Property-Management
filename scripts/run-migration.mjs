/**
 * Runs supabase/deploy.sql against Supabase using the Management API.
 *
 * deploy.sql is the FULL idempotent schema (CREATE TABLE IF NOT EXISTS, etc.)
 * and is safe to re-run against an existing database.
 *
 * Requires SUPABASE_ACCESS_TOKEN (personal access token from
 * https://supabase.com/dashboard/account/tokens).
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

const sql = readFileSync(join(__dirname, '../supabase/deploy.sql'), 'utf-8');

/**
 * Split SQL into individual statements while correctly handling:
 *   - Dollar-quoted strings  ($$...$$, $BODY$...$BODY$)
 *   - Single-quoted strings  ('...')
 *   - Line comments          (-- ...)
 *   - Block comments         (/* ... *\/)
 *
 * Semicolons that appear inside any of the above are NOT treated as
 * statement terminators — which is what breaks a naive split('/;/').
 */
function splitStatements(sql) {
  const statements = [];
  let i = 0;
  let start = 0;

  while (i < sql.length) {
    // ── Line comment ────────────────────────────────────────────────────────
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }

    // ── Block comment ───────────────────────────────────────────────────────
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // ── Single-quoted string ────────────────────────────────────────────────
    if (sql[i] === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; continue; } // escaped ''
        if (sql[i] === "'") { i++; break; }
        i++;
      }
      continue;
    }

    // ── Dollar-quoted string: $tag$...$tag$ (tag may be empty: $$...$$) ────
    if (sql[i] === '$') {
      let j = i + 1;
      while (j < sql.length && sql[j] !== '$' && /[A-Za-z0-9_]/.test(sql[j])) j++;
      if (j < sql.length && sql[j] === '$') {
        const tag = sql.slice(i, j + 1); // e.g. "$$" or "$BODY$"
        i = j + 1;
        const closeIdx = sql.indexOf(tag, i);
        i = closeIdx !== -1 ? closeIdx + tag.length : sql.length;
        continue;
      }
    }

    // ── Statement terminator ────────────────────────────────────────────────
    if (sql[i] === ';') {
      const stmt = sql.slice(start, i + 1).trim();
      if (stmt && stmt !== ';') statements.push(stmt);
      start = i + 1;
    }

    i++;
  }

  const tail = sql.slice(start).trim();
  if (tail) statements.push(tail);

  return statements;
}

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
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log(`Project: ${PROJECT_REF}`);
  console.log('Running supabase/deploy.sql (full idempotent schema)...\n');

  const statements = splitStatements(sql).filter(s => {
    // Drop comment-only or whitespace-only fragments
    const stripped = s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    return stripped.length > 0;
  });

  console.log(`${statements.length} statements to execute\n`);

  let ok = 0;
  let skipped = 0;

  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 72);
    try {
      await runSQL(stmt);
      console.log(`  OK:   ${preview}`);
      ok++;
    } catch (err) {
      const msg = err.message;
      // All safe "already applied" conditions — the schema is idempotent
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate key') ||
        msg.includes('already an attribute') ||
        msg.includes('invalid input value for enum')
      ) {
        console.log(`  SKIP: ${preview}`);
        skipped++;
      } else {
        console.error(`\n  FAIL: ${preview}`);
        console.error(`        ${msg}\n`);
        process.exit(1);
      }
    }
  }

  console.log(`\nDone: ${ok} applied, ${skipped} already existed.`);
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
