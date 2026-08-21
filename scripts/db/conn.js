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

// execFileSync puts the whole argv in the thrown error's message, and argv[0]
// here is a connection string containing the database password. A failing query
// would print it to the terminal and into any log or transcript that captured
// the output, so every call site goes through this.
function run(args) {
  try {
    return execFileSync(PSQL, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    const redact = (t) => String(t ?? '').split(CONN).join('<connection string>');
    const e = new Error(`psql failed:\n${redact(err.stderr) || redact(err.message)}`);
    e.stderr = redact(err.stderr);
    e.status = err.status;
    throw e;
  }
}

/** Run SQL and return raw stdout. */
function psql(sql, extraArgs = []) {
  return run([CONN, '-v', 'ON_ERROR_STOP=1', '-At', ...extraArgs, '-c', sql]);
}

/** Run a query whose single column is JSON, and parse it. */
function psqlJson(sql) {
  const out = psql(sql).trim();
  return out ? JSON.parse(out) : null;
}

/** Run a .sql file, optionally with psql variables ({ name: value }). */
function psqlFile(file, vars = {}) {
  const varArgs = Object.entries(vars).flatMap(([k, v]) => ['-v', `${k}=${v}`]);
  return run([CONN, '-v', 'ON_ERROR_STOP=1', ...varArgs, '-f', file]);
}

module.exports = { ROOT, PSQL, CONN, psql, psqlJson, psqlFile };
