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

// Which database the scripts talk to. The default is choner-dev, where the
// sample users live and where the app points in development. Production has to
// be named (CHONER_DB=prod): seed:pool --confirm deletes every account, and that
// must never be one forgotten variable away from real people.
const TARGETS = {
  dev: { ref: 'uzhqvvnumvcmuxrmoxde', label: 'choner-dev', passwordVars: ['SUPABASE_DEV_DB_PASSWORD'] },
  prod: { ref: 'bkncpybneoqjnkhhchxg', label: 'PRODUCTION', passwordVars: ['SUPABASE_DB_PASSWORD', 'SUPABASE_PASSWORD'] }
};

function resolveTarget(env) {
  const name = (env.CHONER_DB || 'dev').trim().toLowerCase();
  const target = TARGETS[name];
  if (!target) throw new Error(`CHONER_DB must be "dev" or "prod", not "${env.CHONER_DB}"`);
  return { name, ...target };
}

function connectionString() {
  const env = { ...readEnv(), ...process.env };
  const target = resolveTarget(env);
  const password = target.passwordVars.map((v) => env[v]).find(Boolean);
  if (!password) {
    throw new Error(
      `${target.passwordVars[0]} missing from .env (needed for ${target.label}).` +
        (target.name === 'dev' ? ' To run against production instead, set CHONER_DB=prod.' : '')
    );
  }
  const ref = target.ref;
  // stderr, so it never mixes into output a caller parses.
  console.error(`[db] ${target.label} (${ref})`);

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
