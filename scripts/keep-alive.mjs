#!/usr/bin/env node
/**
 * Supabase keep-alive.
 *
 * Supabase pauses Free-plan projects after ~7 days of low database activity
 * (https://supabase.com/docs/guides/platform/free-project-pausing). "A few
 * user requests to the database each day" is enough to keep a project active.
 *
 * This script makes a lightweight authenticated request that executes a real
 * query against Postgres, so it counts as user database activity and resets
 * the inactivity timer. It is run on a schedule by
 * .github/workflows/keep-alive.yml (and can be run by hand).
 *
 * It exits non-zero if it cannot reach the database, so a broken keep-alive
 * surfaces as a failed GitHub Actions run instead of silently letting the
 * project pause.
 *
 * Primary probe:  POST /rest/v1/rpc/keepalive  (a no-op SQL function granted
 *                 to anon — see supabase/migrations/20260722_keepalive.sql)
 * Fallback probe: GET  /rest/v1/organizations  (a table anon may read)
 */

// Project kept alive: aw-property-management (ref vixpadnfeguwajummnfo).
// The anon key is a publishable key — safe to commit; it only permits
// RLS-guarded reads and executing the keepalive() function. Override either
// value via the SUPABASE_URL / SUPABASE_ANON_KEY environment variables.
const SUPABASE_URL = (
  process.env.SUPABASE_URL || 'https://vixpadnfeguwajummnfo.supabase.co'
).replace(/\/$/, '');

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpeHBhZG5mZWd1d2FqdW1tbmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Mjc2NjQsImV4cCI6MjA5OTEwMzY2NH0.jLueSJ4tXjeQb9cP3eTOehBRSqK1poO_nFhT8WlFRaQ';

const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

const TIMEOUT_MS = 20_000;

async function request(method, path, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${SUPABASE_URL}${path}`, {
      method,
      headers: { ...HEADERS, ...extraHeaders },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Each probe resolves to true on a 2xx (activity registered), false otherwise.
const probes = [
  {
    label: 'POST /rest/v1/rpc/keepalive',
    run: () =>
      request('POST', '/rest/v1/rpc/keepalive', {
        'Content-Type': 'application/json',
      }),
  },
  {
    label: 'GET /rest/v1/organizations?select=id&limit=1',
    run: () => request('GET', '/rest/v1/organizations?select=id&limit=1'),
  },
];

async function main() {
  console.log(`[keep-alive] ${new Date().toISOString()} -> ${SUPABASE_URL}`);

  let lastError = 'no probes ran';
  for (const probe of probes) {
    try {
      const res = await probe.run();
      if (res.ok) {
        console.log(`[keep-alive] OK - ${probe.label} -> ${res.status}`);
        console.log('[keep-alive] Database activity registered; pause timer reset.');
        return;
      }
      lastError = `${probe.label} -> ${res.status} ${res.statusText}`;
      console.warn(`[keep-alive] ${lastError}; trying next probe...`);
    } catch (err) {
      lastError = `${probe.label} threw: ${err?.message || err}`;
      console.warn(`[keep-alive] ${lastError}; trying next probe...`);
    }
  }

  console.error(`[keep-alive] FAILED - could not register activity. Last error: ${lastError}`);
  process.exit(1);
}

main();
