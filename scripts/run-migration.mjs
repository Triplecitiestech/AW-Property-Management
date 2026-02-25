/**
 * Runs supabase/deploy.sql against Supabase using the Management API.
 *
 * Sends the entire schema as ONE query instead of 193 individual calls,
 * which avoids Supabase API rate limits (ThrottlerException).
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

console.log(`Token: ${TOKEN.slice(0, 8)}...${TOKEN.slice(-4)} (length: ${TOKEN.length})`);
console.log(`Project ref: ${PROJECT_REF}`);

const sql = readFileSync(join(__dirname, '../supabase/deploy.sql'), 'utf-8');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** POST to Supabase Management API using Node.js https module. */
function httpsPost(url, headers, body, timeoutMs = 120_000) {
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
        timeout: timeoutMs,
      },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') }));
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error(`Request timed out after ${timeoutMs / 1000}s`)); });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

async function runSQL(query, { timeoutMs = 120_000, retries = 4 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { status, body: text } = await httpsPost(
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
        {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        JSON.stringify({ query }),
        timeoutMs,
      );

      if (status < 200 || status >= 300) {
        let errMsg = `HTTP ${status}`;
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.message || parsed.error || text || `HTTP ${status}`;
        } catch {
          errMsg = text || `HTTP ${status}`;
        }
        throw new Error(errMsg);
      }

      try {
        return text ? JSON.parse(text) : null;
      } catch {
        return null; // non-JSON 2xx — DDL success
      }
    } catch (err) {
      lastErr = err;
      const isRetryable =
        err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' ||
        err.code === 'ETIMEDOUT' || err.message.includes('timed out') ||
        err.message.includes('HTTP 429') || err.message.includes('rate limit') ||
        err.message.includes('ThrottlerException') || err.message.includes('Too Many Requests');
      if (isRetryable && attempt < retries) {
        const wait = attempt * 5000;
        console.log(`  Retrying in ${wait / 1000}s (attempt ${attempt}/${retries}): ${err.message}`);
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

  // Quick connectivity + auth check
  console.log('Testing API connectivity...');
  try {
    const result = await runSQL('SELECT 1 AS ok', { timeoutMs: 30_000 });
    console.log(`✓ API connectivity OK (response: ${JSON.stringify(result)})\n`);
  } catch (err) {
    console.error(`✗ API connectivity FAILED: ${err.message}`);
    console.error('Cannot proceed with migration — check SUPABASE_ACCESS_TOKEN and PROJECT_REF');
    process.exit(1);
  }

  console.log('Running supabase/deploy.sql as a single query (avoids rate limits)...');
  console.log(`SQL size: ${(sql.length / 1024).toFixed(1)} KB\n`);

  try {
    await runSQL(sql, { timeoutMs: 120_000 });
    console.log('✓ Schema migration applied successfully.');
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
