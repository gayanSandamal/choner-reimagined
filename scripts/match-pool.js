#!/usr/bin/env node
//
// Concierge partner matching — the missing half of "Find a partner".
//
// join_match_pool() puts someone into partner_match_requests and sets their
// challenge to 'finding'. Nothing in the app moves them on from there: pairing
// has always been a person inserting a partner_matches row by hand, and
// features/challenges/matching.ts — which knows how to rank and explain every
// candidate pairing — was never wired to the database at all. So the pool grew
// and nobody was ever matched.
//
// This closes that loop without changing the design. It reads the live pool,
// runs the REAL matchPool() (compiled from source on every run, so it cannot
// drift from the tested module), prints the ranked pairs with their scores and
// reasons, and writes only when you explicitly ask it to.
//
//   node scripts/match-pool.js                 review the pairings, write nothing
//   node scripts/match-pool.js --auto          commit them to partner_matches
//   node scripts/match-pool.js --user <uuid>   only pairings involving one person
//   node scripts/match-pool.js --limit 10      cap how many get written
//   node scripts/match-pool.js --min-score 60  raise the bar (default 45)
//
// Dry run is the default deliberately: this writes rows that two real people
// then see as "we found you a partner", which is not something to do by
// accident.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ROOT, psql, psqlJson } = require('./db/conn');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { auto: false, user: null, limit: Infinity, minScore: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--auto') args.auto = true;
    else if (a === '--user') args.user = argv[++i];
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--min-score') args.minScore = Number(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

// ---------------------------------------------------------------------------
// The algorithm, compiled from source on every run
//
// Compiling rather than reimplementing is the whole point: the scoring stays in
// one tested place and this script cannot quietly diverge from it. Everything
// non-relative in matching.ts's import graph is `import type`, so nothing has
// to resolve the @/ alias at runtime.
// ---------------------------------------------------------------------------

function loadMatching() {
  const tsconfig = path.join(ROOT, 'scripts', 'db', 'tsconfig.match.json');
  execFileSync('npx', ['tsc', '-p', tsconfig], { cwd: ROOT, stdio: 'inherit' });
  const compiled = path.join(ROOT, '.tmp-match', 'features', 'challenges', 'matching.js');
  delete require.cache[require.resolve(compiled)];
  return require(compiled);
}

// ---------------------------------------------------------------------------
// The pool
//
// Column aliases are quoted so they survive Postgres lower-casing them — they
// have to arrive as the exact camelCase names the Candidate interface declares.
// ---------------------------------------------------------------------------

const POOL_QUERY = `
select coalesce(json_agg(row_to_json(c) order by c."joinedPoolAt"), '[]'::json)
from (
  select
    r.user_id                                as "userId",
    r.challenge_template_id                  as "challengeTemplateId",
    (uc.custom_habit_title is not null)      as "isCustomHabit",
    t.duration_days                          as "durationDays",
    coalesce(p.accountability_mode, 'encouraging') as style,
    p.timezone                               as timezone,
    p.city                                   as city,
    (extract(epoch from r.created_at) * 1000)::bigint as "joinedPoolAt",
    coalesce(p.full_name, 'Someone')         as "fullName",
    t.title                                  as habit,
    coalesce((
      select json_agg(json_build_object(
        'question_key', cr.question_key,
        'choice_key',   cr.choice_key,
        'custom_text',  cr.custom_text))
      from public.challenge_reflections cr where cr.user_id = r.user_id
    ), '[]'::json)                           as reflections,
    coalesce((
      select json_agg(case when pm.user_a = r.user_id then pm.user_b else pm.user_a end)
      from public.partner_matches pm
      where (pm.user_a = r.user_id or pm.user_b = r.user_id)
        and pm.status in ('declined', 'expired')
    ), '[]'::json)                           as "previouslyUnmatchedWith"
  from public.partner_match_requests r
  join public.user_challenges uc     on uc.id = r.user_challenge_id
  join public.challenge_templates t  on t.id  = r.challenge_template_id
  join public.profiles p             on p.id  = r.user_id
  where r.status = 'waiting'
    and uc.status = 'active'
    -- Somebody already paired must never be offered again, whatever their
    -- stale pool row still says.
    and uc.partner_state in ('finding', 'solo')
) c;
`;

// ---------------------------------------------------------------------------
// Blurbs
//
// One curated line about each person, written at pairing time. Never their raw
// reflections: those are personal, and until both sides confirm, these two are
// strangers to each other. Their own words are used where they wrote some, cut
// to a single sentence; otherwise we say only what can be said without quoting.
// ---------------------------------------------------------------------------

const STYLE_BLURB = {
  competitive: 'is here for a bit of friendly rivalry',
  momentum: 'hates breaking a streak',
  encouraging: 'responds to warmth rather than pressure',
  team: 'is the type who shows up for other people'
};

function blurbFor(candidate) {
  const first = String(candidate.fullName || 'They').trim().split(/\s+/)[0];
  const ownWords = (candidate.reflections || [])
    .map((r) => (r.custom_text || '').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0];

  if (ownWords) {
    const sentence = ownWords.split(/(?<=[.!?])\s/)[0].replace(/[.\s]+$/, '');
    const trimmed = sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence;
    return `${first} said: "${trimmed}."`;
  }

  const style = STYLE_BLURB[candidate.style] || 'is getting started';
  const where = candidate.city ? ` Based in ${candidate.city}.` : '';
  return `${first} ${style}.${where}`;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

// Colour only when stdout is a terminal, so piping the report into a file or
// through grep does not litter it with escape sequences.
const COLOUR = process.stdout.isTTY;
const wrap = (code, s) => (COLOUR ? `\u001b[${code}m${s}\u001b[0m` : String(s));
const bold = (s) => wrap(1, s);
const dim = (s) => wrap(2, s);

function report(pairs, unmatched, byId, willWrite) {
  console.log('');
  console.log(bold(`${pairs.length} pairing${pairs.length === 1 ? '' : 's'} proposed`));
  console.log(dim(`${unmatched.length} left in the pool`));
  console.log('');

  pairs.forEach((pair, idx) => {
    const a = byId.get(pair.a);
    const b = byId.get(pair.b);
    console.log(
      `${bold(String(idx + 1).padStart(3) + '.')} ${bold(String(pair.score).padStart(3))}  ` +
        `${a.fullName} ${dim(`(${a.city || '-'}, signal ${pair.aSignal})`)}  ` +
        `${dim('+')}  ${b.fullName} ${dim(`(${b.city || '-'}, signal ${pair.bSignal})`)}`
    );
    console.log(`      ${dim(a.habit)}`);
    pair.reasons.forEach((r) => console.log(`      ${dim('· ' + r)}`));
  });

  console.log('');
  if (!willWrite) {
    console.log(dim('Dry run - nothing written. Re-run with --auto to commit these.'));
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

function writeMatches(pairs, byId) {
  // One transaction for the whole batch: a half-written pairing leaves one
  // person marked 'matched' with nobody on the other end of it.
  const statements = ['begin;'];

  for (const pair of pairs) {
    const a = byId.get(pair.a);
    const b = byId.get(pair.b);
    statements.push(
      `insert into public.partner_matches
         (user_a, user_b, challenge_template_id, blurb_about_a, blurb_about_b, status)
       values (${q(pair.a)}, ${q(pair.b)}, ${q(a.challengeTemplateId)},
               ${q(blurbFor(a))}, ${q(blurbFor(b))}, 'pending');`
    );
    statements.push(
      `update public.partner_match_requests set status = 'matched', updated_at = now()
       where user_id in (${q(pair.a)}, ${q(pair.b)}) and status = 'waiting';`
    );
    statements.push(
      `update public.user_challenges set partner_state = 'matched'
       where user_id in (${q(pair.a)}, ${q(pair.b)})
         and status = 'active' and partner_state = 'finding';`
    );
  }

  statements.push('commit;');
  psql(statements.join('\n'));
}

// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 26).join('\n'));
    return;
  }

  const { matchPool, DEFAULT_MIN_SCORE } = loadMatching();
  const minScore = args.minScore ?? DEFAULT_MIN_SCORE;

  const candidates = psqlJson(POOL_QUERY) || [];
  if (candidates.length === 0) {
    console.log('Pool is empty - nobody is waiting.');
    return;
  }

  const byId = new Map(candidates.map((c) => [c.userId, c]));
  let { pairs, unmatched } = matchPool(candidates, minScore);

  if (args.user) {
    if (!byId.has(args.user)) {
      console.error(`${args.user} is not in the pool.`);
      process.exitCode = 1;
      return;
    }
    pairs = pairs.filter((p) => p.a === args.user || p.b === args.user);
  }
  if (Number.isFinite(args.limit)) pairs = pairs.slice(0, args.limit);

  console.log(
    dim(
      `Pool: ${candidates.length} waiting - min score ${minScore}` +
        (args.user ? ` - filtered to ${args.user}` : '')
    )
  );
  report(pairs, unmatched, byId, args.auto);

  if (args.auto && pairs.length > 0) {
    writeMatches(pairs, byId);
    console.log(bold(`Wrote ${pairs.length} pending match${pairs.length === 1 ? '' : 'es'}.`));
    console.log(dim('Both sides now see the match and must confirm before it goes live.'));
    console.log('');
  }
}

main();
