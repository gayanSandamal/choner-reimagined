#!/usr/bin/env node
//
// Wipe every account and seed 500 sample users into the partner pool.
//
//   node scripts/seed-sample-pool.js              show what would be destroyed
//   node scripts/seed-sample-pool.js --confirm    wipe everything, seed 500
//   node scripts/seed-sample-pool.js --top-up 100 ADD 100 people, delete nothing
//
// Top-up exists because auto-matching drains the pool, and what it leaves behind
// is specifically the people the matcher refuses to pair: two low commitment
// signals carry a -40 penalty they can never score past, so a residue of them
// is permanently unmatchable with each other. Topping up puts anchors back in.
//
// THIS DELETES EVERY auth.users ROW, including yours, and there is no backup.
// The confirm flag is not decoration: the difference between reviewing this and
// running it is every account on the project.
//
// The destructive work lives in db/seed-sample-pool.sql — this wrapper exists
// to make it hard to run by accident, and to show a before/after so the result
// is verified rather than assumed.

const path = require('path');
const { psqlJson, psqlFile } = require('./db/conn');

const SQL_FILE = path.join(__dirname, 'db', 'seed-sample-pool.sql');

// ---------------------------------------------------------------------------
// Storage
//
// storage.protect_delete() rejects direct deletes from storage.objects — the
// row and the underlying file have to go together, so removals must run
// through the Storage API. The service-role key needed for that already lives
// in app_config (the sweeps read it from there), so nothing extra has to be
// configured to run this.
// ---------------------------------------------------------------------------

async function emptyBuckets() {
  const cfg = psqlJson(`
    select json_build_object(
      'key', (select value from public.app_config where key = 'service_role_key'),
      'url', (select value from public.app_config where key = 'functions_base_url')
    );`);

  if (!cfg || !cfg.key) {
    console.log('  storage: no service_role_key in app_config, skipping file cleanup');
    return;
  }

  // functions_base_url is <project>.supabase.co/functions/v1 — the storage
  // endpoint hangs off the same host.
  const base = String(cfg.url || '').replace(/\/functions\/v1\/?$/, '');
  if (!base) {
    console.log('  storage: could not derive the project URL, skipping file cleanup');
    return;
  }

  const objects = psqlJson(`
    select coalesce(json_agg(json_build_object('bucket', bucket_id, 'name', name)), '[]'::json)
    from storage.objects;`);

  if (objects.length === 0) {
    console.log('  storage: already empty');
    return;
  }

  const byBucket = new Map();
  for (const o of objects) {
    if (!byBucket.has(o.bucket)) byBucket.set(o.bucket, []);
    byBucket.get(o.bucket).push(o.name);
  }

  for (const [bucket, names] of byBucket) {
    const res = await fetch(`${base}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefixes: names })
    });
    if (!res.ok) {
      throw new Error(`storage delete failed for ${bucket}: ${res.status} ${await res.text()}`);
    }
    console.log(`  storage: removed ${names.length} object(s) from ${bucket}`);
  }
}

const COUNTS = `
select json_build_object(
  'auth_users',    (select count(*) from auth.users),
  'profiles',      (select count(*) from public.profiles),
  'challenges',    (select count(*) from public.user_challenges),
  'pool_waiting',  (select count(*) from public.partner_match_requests where status = 'waiting'),
  'matches',       (select count(*) from public.partner_matches),
  'reflections',   (select count(*) from public.challenge_reflections),
  'checkins',      (select count(*) from public.task_checkins),
  'storage',       (select count(*) from storage.objects),
  'templates',     (select count(*) from public.challenge_templates),
  'app_config',    (select count(*) from public.app_config),
  'cron_jobs',     (select count(*) from cron.job)
);`;

function show(label, counts) {
  console.log(`\n${label}`);
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(14)} ${v}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const confirmed = argv.includes('--confirm');
  const topUpIdx = argv.indexOf('--top-up');
  const topUp = topUpIdx === -1 ? null : Number(argv[topUpIdx + 1]);

  if (topUp !== null && (!Number.isInteger(topUp) || topUp < 1)) {
    console.error('--top-up needs a positive whole number, e.g. --top-up 100');
    process.exitCode = 1;
    return;
  }

  const before = psqlJson(COUNTS);
  show('Current state', before);

  // Top-up deletes nothing, so it does not need the confirm gate.
  if (topUp !== null) {
    console.log(`\nAdding ${topUp} sample users to the pool. Nothing is deleted.`);
    console.log('All of them anchor-capable — that is what a drained pool is short of.');
    const out = psqlFile(SQL_FILE, { wipe: 'false', count: topUp, anchors: 'true' });
    out.split('\n').filter((l) => l.startsWith('NOTICE') || l.startsWith('MODE')).forEach((n) => console.log(`  ${n}`));

    const after = psqlJson(COUNTS);
    show('New state', after);
    console.log('\nPassword for every sample account: ChonerTest123!');
    console.log('\nThey are matched automatically within a minute or two.');
    console.log('Force a run now with: npm run match -- --auto\n');
    return;
  }

  if (!confirmed) {
    console.log('\nThis would DELETE all %d accounts and everything belonging to them,', before.auth_users);
    console.log('then create 500 sample users waiting in the partner pool.');
    console.log('\nchallenge_templates, app_config and the cron jobs are left alone —');
    console.log('app_config holds the keys both notification sweeps depend on.');
    console.log('\nRe-run with --confirm to do it. There is no undo.');
    console.log('To ADD people without deleting anyone: --top-up <n>\n');
    return;
  }

  console.log('\nWiping and seeding...');
  // Files first: once auth.users is gone we have lost the only record of which
  // objects belonged to anybody.
  await emptyBuckets();
  const out = psqlFile(SQL_FILE, { wipe: 'true', count: 500, anchors: 'false' });
  const notices = out.split('\n').filter((l) => l.startsWith('NOTICE'));
  notices.forEach((n) => console.log(`  ${n}`));

  const after = psqlJson(COUNTS);
  show('New state', after);

  // Config surviving the wipe is the thing most likely to be quietly wrong, so
  // it is asserted rather than eyeballed.
  const problems = [];
  if (after.app_config !== before.app_config) {
    problems.push(`app_config went from ${before.app_config} to ${after.app_config} — the sweeps need those rows`);
  }
  if (after.templates !== before.templates) {
    problems.push(`challenge_templates changed: ${before.templates} -> ${after.templates}`);
  }
  if (after.cron_jobs !== before.cron_jobs) {
    problems.push(`cron jobs changed: ${before.cron_jobs} -> ${after.cron_jobs}`);
  }
  if (after.auth_users !== 500) {
    problems.push(`expected 500 users, got ${after.auth_users}`);
  }

  if (problems.length) {
    console.error('\nPROBLEMS:');
    problems.forEach((p) => console.error(`  ! ${p}`));
    process.exitCode = 1;
    return;
  }

  console.log('\nDone. Sign-in password for every sample account: ChonerTest123!');
  console.log('Emails run sample001@choner.test .. sample500@choner.test');
  console.log('\nNext: npm run match         (review pairings)');
  console.log('      npm run match -- --auto (write them)\n');
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exitCode = 1;
});
