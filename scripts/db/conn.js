// Shared Postgres access for the maintenance scripts.
//
// psql rather than a client library on purpose: this repo has no `pg`
// dependency, these scripts run occasionally by hand, and shelling out keeps
// the dependency footprint at zero. The password lives in .env, already the
// source of truth for `supabase db push`.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// Not on PATH in a default Homebrew install, so look there before giving up.
const PSQL_CANDIDATES = [
  '/opt/homebrew/opt/libpq/bin/psql',
  '/usr/local/opt/libpq/bin/psql',
  '/usr/bin/psql',
  'psql'
];

function findPsql() {
  for (const p of PSQL_CANDIDATES) {
    try {
      execFileSync(p, ['--version'], { stdio: 'ignore' });
      return p;
    } catch {
      /* try the next one */
    }
  }
  throw new Error(
    'psql not found. Install with `brew install libpq` (it is keg-only, so it ' +
      'will not be on PATH — the path above is where Homebrew puts it).'
  );
}

function readEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) throw new Error('.env not found at repo root');
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function connectionString() {
  const env = { ...readEnv(), ...process.env };
  const password = env.SUPABASE_DB_PASSWORD || env.SUPABASE_PASSWORD;
  if (!password) throw new Error('SUPABASE_DB_PASSWORD missing from .env');

  const url = env.EXPO_PUBLIC_SUPABASE_URL || '';
  const ref = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  if (!ref) throw new Error('could not read the project ref from EXPO_PUBLIC_SUPABASE_URL');

  const region = env.SUPABASE_DB_REGION || 'aws-1-ap-southeast-1';
  // encodeURIComponent, because a password with @ or / in it silently produces
  // a connection string that parses into something else entirely.
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${region}.pooler.supabase.com:5432/postgres`;
}

const PSQL = findPsql();
const CONN = connectionString();

/** Run SQL and return raw stdout. */
function psql(sql, extraArgs = []) {
  return execFileSync(PSQL, [CONN, '-v', 'ON_ERROR_STOP=1', '-At', ...extraArgs, '-c', sql], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
}

/** Run a query whose single column is JSON, and parse it. */
function psqlJson(sql) {
  const out = psql(sql).trim();
  return out ? JSON.parse(out) : null;
}

/** Run a .sql file. */
function psqlFile(file) {
  return execFileSync(PSQL, [CONN, '-v', 'ON_ERROR_STOP=1', '-f', file], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
}

module.exports = { ROOT, PSQL, CONN, psql, psqlJson, psqlFile };
