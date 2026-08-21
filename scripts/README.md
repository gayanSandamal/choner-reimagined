# Maintenance scripts

Two scripts, both talking to the hosted Supabase project through `psql` over the
pooler. Credentials come from `.env` (`SUPABASE_DB_PASSWORD`), which is already
what `supabase db push` uses, so nothing extra needs configuring.

`psql` is not on `PATH` in a default Homebrew install — it is keg-only. Install
with `brew install libpq`; `scripts/db/conn.js` knows where to look.

---

## `npm run seed:pool` — wipe accounts, seed 500 sample users

```bash
npm run seed:pool              # show what would be destroyed, change nothing
npm run seed:pool -- --confirm # do it
```

**Destroys every `auth.users` row and everything belonging to them.** There is no
backup and no undo. The confirm flag is the only thing between reviewing this and
losing every account on the project.

What survives, deliberately: `challenge_templates`, `app_config` and the cron
jobs. `app_config` holds `service_role_key` and `functions_base_url`, which both
notification sweeps read — those rows are inserted out-of-band rather than by any
migration, so **`supabase db reset` would silently break notifications** and this
script exists partly to avoid that trap. The wrapper asserts all three survived
and exits non-zero if not.

Two things the wipe has to handle specially:

- `challenge_invites.invited_by` and `groups.created_by` are `ON DELETE NO
  ACTION`, so they abort the `auth.users` delete rather than cascade. They go
  first.
- `storage.protect_delete()` rejects direct deletes from `storage.objects`, so
  files are removed over the Storage API before the SQL runs.

### What gets created

500 users, `sample001@choner.test` … `sample500@choner.test`, all with the
password **`ChonerTest123!`** — you can sign in as any of them to see the other
side of a match.

Each has a profile (name, city, IANA timezone, tone, daily deadline), one active
challenge in `partner_state = 'finding'`, "Why" reflections, a waiting row in
`partner_match_requests`, and — for a third of them — some check-in history.

Distribution is tuned for the matcher rather than for looking pretty:

| Dimension | Shape | Why |
|---|---|---|
| Timezone | ~60% `Asia/Colombo`, rest spread to +/- 10h | Timezone proximity scores zero past a 5-hour gap, so a dense local cohort is what makes anyone matchable |
| Template | Round-robin across all 15 active | Pairing across different habits is a hard block; a thin cohort is an unmatchable one |
| Commitment | Five tiers, signals 100 / 90 / 50 / 33 / 19 | The algorithm scores *asymmetry*, so a uniformly keen pool would score badly everywhere |
| Joined pool | Spread over 5 days | The fairness boost kicks in after 48h |

**The commitment tier is hashed, not `i % 5`, and that is load-bearing.** Templates
are assigned round-robin as `i % 15`, and 5 divides 15 — so a plain `i % 5` gives
every user doing a given habit the *same* tier. Because the matcher hard-rules
out pairing across habits, every candidate pair would then have identical
commitment signals and productive asymmetry could never occur. The first run of
this seed did exactly that: 146 pairs, every single one "no clear anchor".
Decorrelating took it to 204 pairs led by genuine 100/48 and 50/19 anchor pairings.

---

## `npm run match` — look at what the matcher is doing

Matching is **automatic**. `choner-partner-matching` runs every 5 minutes and
pairs anyone waiting in the pool. This script is no longer the matcher — it is a
client for the same `partner-match` edge function the cron calls, so there is one
implementation and it cannot drift.

```bash
npm run match                              # review what the matcher WOULD do
npm run match -- --auto                    # run it for real, now
npm run match -- --email you@example.com   # the best partners for one person
npm run match -- --user <uuid>             # same, by id
npm run match -- --limit 10                # cap the list
npm run match -- --min-score 60            # raise the bar (default 45)
```

### Consent

Only people who tapped **Find a partner** are ever considered. That is
structural, not a filter: `partner_match_requests` has a row only because
`join_match_pool()` inserted one when the user asked. Someone who never asked is
invisible to matching. `leave_match_pool()` takes them out; `decline_match()`
deliberately puts both people back to `waiting`, because turning down one
suggestion is not withdrawing consent to be matched at all.

Nothing is auto-**confirmed**. Matches are written `pending` and both people
still say yes in the app before a pairing goes live. That is the part that
genuinely needed to stay a human decision.

### Why an edge function

The scoring lives in `features/challenges/matching.ts` and is tested there.
`PARTNER_MATCHING.md` warns specifically against a second copy of the rules, so
`supabase/functions/partner-match` imports that module directly rather than
reimplementing it in SQL. pg_cron cannot call TypeScript, so
`run_partner_matching()` posts to the function the same way the notification
sweeps post to `send-push`.

Two changes were needed to make one module run under both Metro and Deno:
`matching.ts` imports `./reflections.ts` with an explicit extension, and
`reflections.ts` uses a relative path instead of the `@/` alias. Deno has no path
aliases and requires extensions. `allowImportingTsExtensions` is on in
`tsconfig.json`, and `jest.config.js` maps the extension back off.

### It had to get faster to run server-side

The first deploy died with `WORKER_RESOURCE_LIMIT`. Scoring is O(n²), so a
500-person pool was ~122k `scorePair` calls, and `offsetMinutesFor` built a fresh
`Intl.DateTimeFormat` on every one — roughly a quarter of a million of the most
expensive operation in the module. Node absorbed that; an edge worker will not.

Two behaviour-preserving fixes, both in `matching.ts` (all 78 tests unchanged):

- **Memoise the timezone offset** per `(zone, instant)`. `matchPool` passes one
  `now` through a whole run, so this is a handful of entries instead of 244k
  constructions.
- **Bucket by habit before pairing.** `hardBlock` rejects two people on different
  templates outright, so every cross-template pair was wasted work — ~122k
  comparisons to keep ~8k. Same answer for a fifteenth of the cost.

Full 495-person pool now scores in about 3 seconds.

### `--user` solves for one person, it does not filter

Without `--user` the pool is optimised as a whole, greedily by score. Filtering
that result to one person is the wrong question, and the first version of this
flag got it wrong: somebody who joined a minute ago has no fairness boost, so
every viable partner gets claimed by an established pair before their turn, and
it reported **"0 pairings proposed"** for a user who had 31 viable partners
scoring up to 83. `--user` now scores that person against the whole pool and
shortlists their top five; `--auto` writes only #1.

### pg_cron will not notice a new job until you reload

`cron.schedule()` inserts a row, returns a jobid, and `cron.job` shows the job
active. Everything looks fine. But the pg_cron launcher caches its job list and
on this project does not pick up rows added afterwards — the job simply never
runs, and `cron.job_run_details` stays empty for it indefinitely.

`choner-daily-reminders` was scheduled at `15 * * * *` one morning and had not
run once six hours later, while `choner-missed-checkins` — scheduled in July,
before the launcher last reloaded — ran every hour exactly as expected. A
throwaway `select 1` job on `* * * * *` confirmed it: no new job of any kind
fired. `select pg_reload_conf();` sends the launcher a SIGHUP, it re-reads
`cron.job`, and the next probe fired within twenty seconds.

**Any migration that schedules a job must end with `select pg_reload_conf();`**
or it ships a feature that is dead on arrival and looks correct from every angle
you would normally check. To verify a job is genuinely alive:

```sql
select j.jobname, j.schedule, count(d.runid) as runs, max(d.start_time) as last_run
from cron.job j left join cron.job_run_details d on d.jobid = j.jobid
group by 1, 2 order by 1;
```

`runs = 0` on a job older than its interval means it is not scheduled, whatever
`cron.job.active` claims.

### The pool drains, and that is correct

Auto-matching empties the pool as people get paired — in production that is the
point. For testing it means the 500 seeded users thin out, and the ones left are
specifically those the matcher could not place (mostly low commitment signal).
That is still useful: a new account with well-written "Why" answers becomes the
anchor those people need, which scores well. Re-run `npm run seed:pool --
--confirm` to refill.

---

## Testing "Find a partner" end to end

1. Sign up fresh in the app and finish onboarding.
2. Pick a habit **from the list** — "Find a partner" is deliberately hidden for a
   habit you wrote yourself, since nobody else in the pool is doing it.
3. Tap **Find a partner**. You are now `finding`, with 500 people waiting.
4. Match yourself, by the email you signed up with:
   ```bash
   npm run match -- --email you@example.com          # review the shortlist
   npm run match -- --email you@example.com --auto   # pair with #1
   ```
5. Reopen the app — the match banner appears. Confirm.
6. To see the other side, sign in as your matched partner
   (`sampleNNN@choner.test` / `ChonerTest123!`) and confirm there too. Both
   hearts go live.

If step 4 says you are not in the pool, it also says why — no active challenge,
a custom habit (Find is hidden for those), already matched, or simply not having
tapped Find a partner yet.

To reset the pool after experimenting:

```sql
update public.user_challenges set partner_state = 'finding', partner_user_id = null
  where user_id in (select user_a from public.partner_matches
                    union select user_b from public.partner_matches);
update public.partner_match_requests set status = 'waiting' where status = 'matched';
delete from public.partner_matches;
```
