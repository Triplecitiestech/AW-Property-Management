/**
 * Runs supabase/deploy.sql against Supabase using the Management API.
 *
 * Executes statements in small batches (up to BATCH_SIZE per API call) to
 * avoid the Supabase ThrottlerException while still keeping the total number
 * of HTTP requests low (~20 instead of 193).
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

// Number of SQL statements to bundle into each API call.
// ~10 batches of 20 = well under any rate limit.
const BATCH_SIZE = 20;

// Delay between batches (ms). 10 batches × 1s = ~10s extra — negligible.
const BATCH_DELAY_MS = 1000;

if (!TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN is required.');
  console.error('Get one at: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

console.log(`Token: ${TOKEN.slice(0, 8)}...${TOKEN.slice(-4)} (length: ${TOKEN.length})`);
console.log(`Project ref: ${PROJECT_REF}`);

const sql = readFileSync(join(__dirname, '../supabase/deploy.sql'), 'utf-8');

/**
 * Split SQL into individual statements while correctly handling:
 *   - Dollar-quoted strings  ($$...$$, $BODY$...$BODY$)
 *   - Single-quoted strings  ('...')
 *   - Line comments          (-- ...)
 *   - Block comments         (/* ... *\/)
 */
function splitStatements(sql) {
  const statements = [];
  let i = 0;
  let start = 0;

  while (i < sql.length) {
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (sql[i] === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; continue; }
        if (sql[i] === "'") { i++; break; }
        i++;
      }
      continue;
    }
    if (sql[i] === '$') {
      let j = i + 1;
      while (j < sql.length && sql[j] !== '$' && /[A-Za-z0-9_]/.test(sql[j])) j++;
      if (j < sql.length && sql[j] === '$') {
        const tag = sql.slice(i, j + 1);
        i = j + 1;
        const closeIdx = sql.indexOf(tag, i);
        i = closeIdx !== -1 ? closeIdx + tag.length : sql.length;
        continue;
      }
    }
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

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyBuf = Buffer.from(body, 'utf-8');
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: { ...headers, 'Content-Length': bodyBuf.length },
        timeout: 60_000,
      },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') }));
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out after 60s')); });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

async function runSQL(query, retries = 4) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { status, body: text } = await httpsPost(
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
        { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        JSON.stringify({ query })
      );

      if (status < 200 || status >= 300) {
        let errMsg = `HTTP ${status}`;
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.message || parsed.error || text || `HTTP ${status}`;
        } catch { errMsg = text || `HTTP ${status}`; }
        throw new Error(errMsg);
      }

      try { return text ? JSON.parse(text) : null; }
      catch { return null; }
    } catch (err) {
      lastErr = err;
      const isRetryable =
        err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' ||
        err.code === 'ETIMEDOUT' || err.message.includes('timed out') ||
        err.message.includes('HTTP 429') || err.message.includes('rate limit') ||
        err.message.includes('ThrottlerException') || err.message.includes('Too Many Requests');
      if (isRetryable && attempt < retries) {
        const wait = attempt * 5000;
        console.log(`  Rate-limit/network retry in ${wait / 1000}s (attempt ${attempt}/${retries}): ${err.message.slice(0, 120)}`);
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

  console.log('Testing API connectivity...');
  try {
    const result = await runSQL('SELECT 1 AS ok');
    console.log(`✓ API connectivity OK (response: ${JSON.stringify(result)})\n`);
  } catch (err) {
    console.error(`✗ API connectivity FAILED: ${err.message}`);
    process.exit(1);
  }

  const statements = splitStatements(sql).filter(s => {
    const stripped = s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    return stripped.length > 0;
  });

  console.log(`Running supabase/deploy.sql — ${statements.length} statements in batches of ${BATCH_SIZE}...\n`);

  // Group statements into batches
  const batches = [];
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    batches.push(statements.slice(i, i + BATCH_SIZE));
  }

  let ok = 0;
  let skipped = 0;

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    const batchSQL = batch.join('\n');
    const stmtRange = `${bi * BATCH_SIZE + 1}-${Math.min((bi + 1) * BATCH_SIZE, statements.length)}`;

    try {
      await runSQL(batchSQL);
      console.log(`  OK   batch [${bi + 1}/${batches.length}] statements ${stmtRange}`);
      ok += batch.length;
    } catch (err) {
      const msg = err.message;
      const isSafe =
        msg.includes('already exists') ||
        msg.includes('duplicate key') ||
        msg.includes('already an attribute') ||
        msg.includes('invalid input value for enum') ||
        msg.includes('permission denied') ||
        msg.includes('must be owner') ||
        msg.includes('tuple concurrently') ||
        msg.includes('40001') ||
        msg.includes('40P01');

      if (isSafe) {
        console.log(`  SKIP batch [${bi + 1}/${batches.length}] statements ${stmtRange}: ${msg.slice(0, 120)}`);
        // Fall back to executing this batch statement-by-statement so we skip only the offender
        for (const stmt of batch) {
          const preview = stmt.replace(/\s+/g, ' ').slice(0, 60);
          try {
            await runSQL(stmt);
            ok++;
          } catch (stmtErr) {
            const smsg = stmtErr.message;
            const stmtSafe =
              smsg.includes('already exists') || smsg.includes('duplicate key') ||
              smsg.includes('already an attribute') || smsg.includes('invalid input value for enum') ||
              smsg.includes('permission denied') || smsg.includes('must be owner') ||
              smsg.includes('tuple concurrently') || smsg.includes('40001') || smsg.includes('40P01');
            if (stmtSafe) {
              console.log(`    SKIP stmt: ${preview} — ${smsg.slice(0, 80)}`);
              skipped++;
            } else {
              console.error(`\n    FAIL stmt: ${preview}`);
              console.error(`         Error: ${smsg}`);
              process.exit(1);
            }
          }
        }
      } else {
        console.error(`\n  FAIL batch [${bi + 1}/${batches.length}] statements ${stmtRange}`);
        console.error(`       Error: ${msg}`);
        console.error('\nFirst statement in batch:');
        console.error(batch[0]);
        process.exit(1);
      }
    }

    // Short pause between batches to avoid rate limits
    if (bi < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }

  console.log(`\nDone: ${ok} applied, ${skipped} skipped.`);
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
