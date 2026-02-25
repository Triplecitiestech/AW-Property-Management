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
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'ilooxnlkovwbxymwieaj';

if (!TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN is required.');
  console.error('Get one at: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

// Diagnostic: print token metadata without exposing value
console.log(`Token: ${TOKEN.slice(0, 8)}...${TOKEN.slice(-4)} (length: ${TOKEN.length})`);
console.log(`Project ref: ${PROJECT_REF}`);

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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** POST to Supabase Management API using Node.js https module (avoids undici/fetch quirks). */
function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyBuf = Buffer.from(body, 'utf-8');
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': bodyBuf.length,
        },
        timeout: 30_000,
      },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') }));
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out after 30s')); });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

async function runSQL(query, retries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { status, body: text } = await httpsPost(
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
        {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        JSON.stringify({ query })
      );
      if (status < 200 || status >= 300) throw new Error(`HTTP ${status}: ${text}`);
      return text ? JSON.parse(text) : null;
    } catch (err) {
      lastErr = err;
      const isNetworkError = err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' ||
        err.code === 'ETIMEDOUT' || err.message.includes('timed out');
      if (isNetworkError && attempt < retries) {
        const wait = attempt * 2000;
        console.log(`  Network error on attempt ${attempt}, retrying in ${wait/1000}s: ${err.message}`);
        await sleep(wait);
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}

async function main() {
  console.log(`Project: ${PROJECT_REF}`);

  // Quick connectivity + auth check before running the full migration
  console.log('Testing API connectivity...');
  try {
    await runSQL('SELECT 1');
    console.log('✓ API connectivity OK\n');
  } catch (err) {
    console.error(`✗ API connectivity FAILED: ${err.message}`);
    console.error('Cannot proceed with migration — check SUPABASE_ACCESS_TOKEN and PROJECT_REF');
    process.exit(1);
  }

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
