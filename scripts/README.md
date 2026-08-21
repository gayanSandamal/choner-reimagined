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

## `npm run match` — concierge partner matching

```bash
npm run match                          # review the pairings, write nothing
npm run match -- --auto                # commit them to partner_matches
npm run match -- --email you@x.com     # shortlist the best partners for one person
npm run match -- --email you@x.com --auto  # ...and pair them with the top one
npm run match -- --user <uuid>         # same, by id instead of email
npm run match -- --limit 10            # cap the list (and what gets written)
npm run match -- --min-score 60        # raise the bar (default 45)
```

This is the missing half of "Find a partner". `join_match_pool()` puts someone in
the pool and sets their challenge to `finding`; nothing in the app ever moved
them on, because pairing has always been a human inserting a `partner_matches`
row, and `features/challenges/matching.ts` was never wired to the database.

The script compiles `matching.ts` from source on every run and calls the real
`matchPool()`, so the scoring cannot drift from the tested module. It prints each
pairing with both commitment signals and the plain-English reasons behind the
score. **Dry run is the default** — `--auto` writes rows that two real people
immediately see as "we found you a partner".

### `--user` solves for one person, it does not filter

Without `--user` the script runs the global assignment: `matchPool()` optimises
the pool as a whole and claims pairs greedily by score.

That makes filtering the global result to one person the wrong question, and the
first version of this flag got it wrong. Somebody who joined the pool a minute
ago has no fairness boost yet, so every viable partner gets claimed by an
established higher-scoring pair before their turn — and the script reported
**"0 pairings proposed"** for a user who actually had 31 viable partners scoring
up to 83. Asking to match one named person means finding the best partner
available *to them*, so `--user` now scores them against the whole pool directly
and shortlists the top five. `--auto` writes only #1: one person, one partner.

Writing a match inserts `partner_matches` (status `pending`, with a curated blurb
about each person), flips both pool rows to `matched`, and moves both challenges
to `partner_state = 'matched'`. Both sides must then confirm in the app before
the pairing goes live.

Blurbs quote the person's own words when they wrote any, cut to one sentence, and
otherwise fall back to their tone and city. Never their raw reflections: until
both sides confirm, these two are strangers.

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
