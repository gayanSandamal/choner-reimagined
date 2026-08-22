#!/usr/bin/env node
//
// Unpair everybody and restock the pool, so Find a partner can be tested from a
// clean slate.
//
//   npm run reset:partners              show what would change
//   npm run reset:partners -- --confirm do it
//   npm run reset:partners -- --resume  turn the 5-minute sweep back on
//
// Deletes pairings ONLY. No account, profile, challenge, reflection or check-in
// is touched — everyone keeps their habit and their history.
//
// It also pauses choner-partner-matching, and that is the part that makes the
// reset hold: the sweep pairs everyone waiting every five minutes, so 870
// restocked sample users would pair off with each other before you could open
// the app. Pausing it costs the tester nothing, because join_match_pool() fires
// a run scoped to the one person who tapped Find and that still happens
// instantly. Only everyone-with-everyone stops.

const path = require('path');
const { psql, psqlJson, psqlFile } = require('./db/conn');

const SQL_FILE = path.join(__dirname, 'db', 'reset-partners.sql');

const COUNTS = `
select json_build_object(
  'matches',        (select count(*) from public.partner_matches),
  'partnered',      (select count(*) from public.user_challenges
                     where status = 'active' and partner_state = 'partnered'),
  'matched',        (select count(*) from public.user_challenges
                     where status = 'active' and partner_state = 'matched'),
  'finding',        (select count(*) from public.user_challenges
                     where status = 'active' and partner_state = 'finding'),
  'solo',           (select count(*) from public.user_challenges
                     where status = 'active' and partner_state = 'solo'),
  'pool_waiting',   (select count(*) from public.partner_match_requests where status = 'waiting'),
  'search_attempts',(select count(*) from public.partner_search_attempts),
  'accounts',       (select count(*) from auth.users),
  'sweep_active',   (select coalesce(bool_or(active), false) from cron.job
                     where jobname = 'choner-partner-matching')
);`;

function show(label, c) {
  console.log(`\n${label}`);
  console.log(`  accounts          ${c.accounts}`);
  console.log(`  partnered         ${c.partnered}`);
  console.log(`  matched (pending) ${c.matched}`);
  console.log(`  finding (in pool) ${c.finding}`);
  console.log(`  solo              ${c.solo}`);
  console.log(`  partner_matches   ${c.matches}`);
  console.log(`  pool waiting      ${c.pool_waiting}`);
  console.log(`  searches used     ${c.search_attempts}`);
  console.log(`  5-min sweep       ${c.sweep_active ? 'ON' : 'paused'}`);
}

function resumeSweep() {
  // cron.alter_job rather than `update cron.job`: that table is not writable by
  // this role, and pg_cron wants changes through its own API. The reload is what
  // makes the launcher notice — it caches its job list.
  psql(
    `select cron.alter_job(jobid, active := true)
     from cron.job where jobname = 'choner-partner-matching';
     select pg_reload_conf();`
  );
  console.log('\n5-minute sweep re-enabled. Everyone waiting in the pool will be');
  console.log('paired on the next run.\n');
}

function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--resume')) {
    resumeSweep();
    return;
  }

  const before = psqlJson(COUNTS);
  show('Current state', before);

  if (!argv.includes('--confirm')) {
    console.log('\nThis would clear every pairing, put the sample accounts back in the');
    console.log('pool, reset the daily search limits, and PAUSE the 5-minute sweep so');
    console.log('the pool stays stocked for you to test against.');
    console.log('\nReal (non-sample) accounts are left out of the pool on purpose —');
    console.log('nobody belongs in it who did not tap Find themselves.');
    console.log('\nNo account, challenge or check-in is deleted.');
    console.log('\nRe-run with --confirm.\n');
    return;
  }

  console.log('\nResetting...');
  psqlFile(SQL_FILE);

  const after = psqlJson(COUNTS);
  show('New state', after);

  const problems = [];
  if (after.matches !== 0) problems.push(`${after.matches} matches survived`);
  if (after.partnered !== 0) problems.push(`${after.partnered} still partnered`);
  if (after.matched !== 0) problems.push(`${after.matched} still matched`);
  if (after.accounts !== before.accounts) {
    problems.push(`accounts changed: ${before.accounts} -> ${after.accounts}`);
  }
  if (after.sweep_active) problems.push('the sweep is still running and will re-pair everyone');

  if (problems.length) {
    console.error('\nPROBLEMS:');
    problems.forEach((p) => console.error(`  ! ${p}`));
    process.exitCode = 1;
    return;
  }

  console.log(`\nDone. ${after.pool_waiting} sample accounts are waiting to be found.`);
  console.log('Nobody has a partner. Everyone has all 3 searches back.');
  console.log('\nTap Find a partner in the app — you are matched in about a second.');
  console.log('When you have finished testing: npm run reset:partners -- --resume\n');
}

main();
