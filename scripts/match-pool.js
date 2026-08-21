#!/usr/bin/env node
//
// Concierge view of partner matching.
//
// This used to BE the matcher: it compiled matching.ts locally and wrote
// partner_matches itself. That made it a second code path for something that is
// now automatic, and two implementations of "who gets paired" is exactly the
// drift PARTNER_MATCHING.md warns about. So it is a client now — it calls the
// same partner-match edge function pg_cron calls, and just renders the answer.
//
//   npm run match                              review what the matcher WOULD do
//   npm run match -- --auto                    run it for real, now
//   npm run match -- --email you@example.com   the best partners for one person
//   npm run match -- --user <uuid>             same, by id
//   npm run match -- --limit 10                cap the list
//   npm run match -- --min-score 60            raise the bar (default 45)
//
// Matching runs on its own every 5 minutes, so this is for looking at the
// reasoning or forcing a run without waiting.
//
// Dry run is still the default: --auto writes rows two real people immediately
// see as "we found you a partner".

const fs = require('fs');
const { psql, psqlJson } = require('./db/conn');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { auto: false, user: null, email: null, limit: null, minScore: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--auto') args.auto = true;
    else if (a === '--user') args.user = argv[++i];
    else if (a === '--email') args.email = argv[++i];
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--min-score') args.minScore = Number(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const COLOUR = process.stdout.isTTY;
const wrap = (code, s) => (COLOUR ? `\u001b[${code}m${s}\u001b[0m` : String(s));
const bold = (s) => wrap(1, s);
const dim = (s) => wrap(2, s);

function report(res, singleUser) {
  const pairs = res.pairs ?? [];

  console.log('');
  if (singleUser) {
    console.log(bold(`${pairs.length} candidate partner${pairs.length === 1 ? '' : 's'}, best first`));
    if (pairs.length === 0) {
      console.log(dim('Nobody in the pool clears the minimum score for them.'));
      console.log(dim('Same habit and same duration are hard requirements — try a lower --min-score.'));
    }
  } else {
    console.log(bold(`${pairs.length} pairing${pairs.length === 1 ? '' : 's'} proposed`));
    console.log(dim(`${res.unmatched} left in the pool`));
  }
  console.log('');

  pairs.forEach((p, idx) => {
    console.log(
      `${bold(String(idx + 1).padStart(3) + '.')} ${bold(String(p.score).padStart(3))}  ` +
        `${p.aName} ${dim(`(${p.aCity || '-'}, signal ${p.aSignal})`)}  ` +
        `${dim('+')}  ${p.bName} ${dim(`(${p.bCity || '-'}, signal ${p.bSignal})`)}`
    );
    console.log(`      ${dim(p.habit)}`);
    (p.reasons ?? []).forEach((r) => console.log(`      ${dim('· ' + r)}`));
  });

  console.log('');
}

// ---------------------------------------------------------------------------
// Why somebody is not in the pool
//
// Absent and non-existent are different problems with different fixes, and the
// common one by far is simply not having tapped Find a partner yet.
// ---------------------------------------------------------------------------

function explainMissing(userId) {
  const who = psqlJson(`
    select coalesce(json_agg(row_to_json(x)), '[]'::json) from (
      select u.email, uc.partner_state, uc.status as challenge_status,
             uc.custom_habit_title, r.status as pool_status
      from auth.users u
      left join public.user_challenges uc on uc.user_id = u.id and uc.status = 'active'
      left join public.partner_match_requests r on r.user_id = u.id
      where u.id = ${q(userId)}
    ) x;`);

  if (who.length === 0) {
    console.error(`No account with the id ${userId}.`);
    return;
  }
  const w = who[0];
  console.error(`${w.email} is not in the matching pool.`);
  if (!w.challenge_status) {
    console.error('  They have no active challenge yet - finish onboarding first.');
  } else if (w.custom_habit_title) {
    console.error(`  Their habit is one they wrote themselves ("${w.custom_habit_title}").`);
    console.error('  Find a partner is hidden for custom habits - nobody else is doing it.');
  } else if (w.partner_state === 'matched' || w.partner_state === 'partnered') {
    console.error(`  They are already ${w.partner_state}.`);
  } else if (w.pool_status !== 'waiting') {
    console.error('  They have not tapped "Find a partner" yet.');
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 23).join('\n'));
    return;
  }

  if (args.email) {
    const found = psqlJson(
      `select coalesce(json_agg(id), '[]'::json) from auth.users where lower(email) = lower(${q(args.email)});`
    );
    if (found.length === 0) {
      console.error(`No account with the email ${args.email}.`);
      process.exitCode = 1;
      return;
    }
    args.user = found[0];
  }

  // Read the service key from app_config, the same place the cron reads it.
  const cfg = psqlJson(`
    select json_build_object(
      'key', (select value from public.app_config where key = 'service_role_key'),
      'url', (select value from public.app_config where key = 'functions_base_url')
    );`);
  if (!cfg?.key || !cfg?.url) {
    console.error('app_config is missing service_role_key or functions_base_url.');
    process.exitCode = 1;
    return;
  }

  const body = { dryRun: !args.auto };
  if (args.user) body.userId = args.user;
  if (args.limit !== null) body.limit = args.limit;
  if (args.minScore !== null) body.minScore = args.minScore;

  const res = await fetch(`${cfg.url}/partner-match`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const out = await res.json().catch(() => null);

  if (res.status === 404 && out?.reason === 'not_in_pool') {
    explainMissing(args.user);
    process.exitCode = 1;
    return;
  }
  if (!res.ok || !out?.ok) {
    console.error(`partner-match failed: ${res.status} ${JSON.stringify(out)}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    dim(
      `Pool: ${out.pool} waiting - min score ${args.minScore ?? 45}` +
        (args.user ? ` - best partners for ${args.user}` : '')
    )
  );
  report(out, Boolean(args.user));

  if (!args.auto) {
    console.log(
      dim(
        args.user
          ? 'Dry run - nothing written. Re-run with --auto to pair them with #1.'
          : 'Dry run - nothing written. Re-run with --auto, or wait for the 5-minute cron.'
      )
    );
    console.log('');
    return;
  }

  console.log(bold(`Wrote ${out.written} pending match${out.written === 1 ? '' : 'es'}.`));
  if (out.skipped?.length) {
    // Someone was claimed between reading the pool and writing — the cron and a
    // manual run overlapping. Ordinary, and worth saying rather than hiding.
    console.log(dim(`${out.skipped.length} skipped: already taken by another run.`));
  }
  console.log(dim('Both sides now see the match and must confirm before it goes live.'));
  console.log('');
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exitCode = 1;
});
