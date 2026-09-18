#!/usr/bin/env node
//
// Clear the daily loop so it can be tested from day zero.
//
//   npm run reset:challenges              show what would change
//   npm run reset:challenges -- --confirm do it
//
// Companion to reset:partners, which deliberately leaves check-ins alone. Run
// both for a full clean slate: this one resets the daily loop, that one resets
// pairing and restocks the pool.
//
// Deletes check-ins and per-day records ONLY. No account, profile, challenge,
// task, reflection or habit choice is touched — every user keeps the challenge
// they chose and goes back to day one of it.

const path = require('path');
const { psql, psqlJson, psqlFile } = require('./db/conn');

const SQL_FILE = path.join(__dirname, 'db', 'reset-challenges.sql');

const COUNTS = `
select json_build_object(
  'checkins',        (select count(*) from public.task_checkins),
  'with_photo',      (select count(*) from public.task_checkins where photo_path is not null),
  'daily_status',    (select count(*) from public.daily_status),
  'with_commitment', (select count(*) from public.user_challenges where commitment_value is not null),
  'prompt_snoozed',  (select count(*) from public.user_challenges
                      where starting_point_prompted_on is not null),
  'challenges',      (select count(*) from public.user_challenges where status = 'active'),
  'reflections',     (select count(*) from public.challenge_reflections)
);`;

function show(label, c) {
  console.log(`\n${label}`);
  console.log(`  active challenges   ${c.challenges}`);
  console.log(`  check-ins           ${c.checkins}  (${c.with_photo} with a photo)`);
  console.log(`  daily_status rows   ${c.daily_status}`);
  console.log(`  starting point set  ${c.with_commitment}`);
  console.log(`  prompt snoozed      ${c.prompt_snoozed}`);
  console.log(`  reflections (kept)  ${c.reflections}`);
}

function main() {
  const argv = process.argv.slice(2);

  const before = psqlJson(COUNTS);
  show('Current state', before);

  if (!argv.includes('--confirm')) {
    console.log('\nThis would delete every check-in and every daily_status row, clear the');
    console.log('capability/commitment numbers, and restart every active challenge at');
    console.log('day one.');
    console.log('\nThe Home "Where are you starting from?" prompt comes back for everyone,');
    console.log('including anyone who had already dismissed it today.');
    console.log('\nNo account, challenge, task, reflection or habit choice is deleted.');
    console.log('Reflections are what drive the commitment signal in matching, so they');
    console.log('are deliberately kept.');
    console.log('\nRe-run with --confirm.\n');
    return;
  }

  console.log('\nResetting...');
  psqlFile(SQL_FILE);

  const after = psqlJson(COUNTS);
  show('New state', after);

  console.log('\nEvery challenge is back at day one with no history.');
  console.log('Run `npm run reset:partners -- --confirm` too if you also want');
  console.log('pairing cleared and the pool restocked.\n');
}

main();
