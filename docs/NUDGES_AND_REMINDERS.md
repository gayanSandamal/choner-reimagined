# Nudges and daily log reminders

Branch: `fix/nudge-and-daily-log-reminders` (off `main`)

Three things are broken or missing. Only one of them is a regression; the other
two never existed. This document separates them, because they have different
fixes and different risk.

---

## What's actually wrong

### 1. The partner missed-day notification is dead — a real regression

`sweep_missed_checkins()` selects challenges with:

```sql
where uc.accountability_mode = 'partner'
```

The single-challenge migration (`202608131600_partner_path_single_challenge.sql`)
retired the two-track model and **pinned every challenge to
`accountability_mode = 'solo'`**, moving the pairing onto `partner_user_id` /
`partner_state`. Its own comment says the column is now "vestigial". The sweep
was never updated, so its `where` clause matches nothing.

Confirmed against production (`bkncpybneoqjnkhhchxg`):

| Check | Result |
| --- | --- |
| `cron.job` → `choner-missed-checkins` | active, `5 * * * *` |
| Last 8 cron runs | all `succeeded` |
| `select public.sweep_missed_checkins()` | **`0`** |
| `daily_status` rows with `missed_notified_at` | **0 of 0 — never fired once** |
| Live `user_challenges` | 2 × `partnered` + 1 × `invited`, **all `accountability_mode='solo'`** |
| `app_config` (`service_role_key`, `functions_base_url`) | both present |

So the plumbing is fine — cron is running, config is set, `send-push` works. The
query simply returns no rows, every hour, silently.

**Second defect in the same function.** It resolves the partner through
`challenge_invites where status = 'accepted'`. Concierge-matched partners
(`confirm_match`) never create an invite row at all. Production has 1 accepted
invite but 2 partnered challenges — so fixing only the mode filter would still
leave matched pairs un-notified.

### 2. There is no nudge UI

The push copy literally reads *"Might be worth a nudge."* and there is nowhere
in the app to nudge from. Nothing in `app/` sends anything of the kind.

`notifications` has `SELECT` / `UPDATE` / `DELETE` policies scoped to
`user_id = auth.uid()` and **no `INSERT` policy** — RLS with no policy denies. A
client cannot write a nudge row directly, so this needs a `security definer` RPC
regardless.

### 3. The self "log your activity" reminder never existed

`streak_risk` is mapped in `send-push`'s `KIND_PREF_MAP` and has an icon in
`app/modals/notifications.tsx`, but **nothing anywhere emits it**. There is no
sweep, no cron job, no trigger.

Current product copy says the opposite of what's being asked for:

- `app/settings/deadline.tsx`: *"Miss it and your partner gets a gentle nudge — never you."*
- `components/home/LateNote.tsx`: *"The spec is explicit that no guilt-push goes to them."*
- `202607311500_missed_day_sweep.sql`: *"The notification goes to the PARTNER only."*

**Resolution (agreed):** the reminder fires **before** the deadline, not after.
That is a reminder toward success rather than a post-mortem, so the no-shame
promise survives intact — and it maps exactly onto the `streak_alerts`
preference that already exists and already reads *"Reminders before your streak
is at risk."*

---

## What shipped

### Phase 1 — the missed-day nudge, revived

`202608211000_fix_missed_checkin_sweep.sql` rewrites `sweep_missed_checkins()`:

- selects on `partner_state = 'partnered' and partner_user_id is not null`
  instead of the vestigial `accountability_mode`;
- reads the recipient off `uc.partner_user_id`, deleting the `challenge_invites`
  lookup entirely — this is what fixes concierge-matched pairs, who never had an
  invite row;
- routes to `/(tabs)/challenges` rather than Home, because that is now where the
  nudge button lives;
- derives past tense from `d < local today` rather than from the scheduled
  notify time. The old expression was correct only for the deferred
  late-deadline case; every other route into the yesterday branch — including
  the backlog that fires on first deploy — would have been announced as
  "hasn't checked in yet today" about a day that had already ended.

The timing design (grace clamp, quiet hours, challenge window, staleness
cut-off) is carried over untouched. It was never the problem.

### Phase 2 — the nudge

`202608211100_nudge_partner.sql` adds `partner_nudges` (unique on
`from_user_id, to_user_id, local_date` — the insert *is* the rate limit, so two
fast taps race against a constraint rather than against each other) and
`nudge_partner()`, which returns `jsonb` rather than raising so the UI can tell
five different refusals apart.

Quiet hours are enforced against the **recipient's** timezone. The automated
sweep already refuses to fire between 22:00 and 08:00; a human-initiated nudge
gets the same courtesy, because intent doesn't make a 3am push welcome.

Client side: `nudgePartner()` takes no arguments — the partner, both timezones
and the daily limit are all resolved server-side, since a client that got to
name its recipient would be a way to nudge strangers. The button sits directly
under the "{Name} hasn't checked in yet" line on the Challenges tab and
disappears once they log, rather than going grey.

`send-push` gains `partner_nudge → accountability_alerts`. **This one needs a
redeploy**: an unmapped kind skips the preference check entirely, so without it
nudges would reach people who had turned accountability alerts off.

### Phase 3 — the pre-deadline reminder

`202608211200_daily_log_reminder.sql` adds `daily_status.reminded_at` and
`sweep_daily_reminders()`, scheduled at `'15 * * * *'` — offset from the missed
sweep at `:05` so the two never contend.

Window is `[deadline - 2h, deadline)`, floored at 08:00. Both ends carry weight:
fire earlier and it is noise about a day with hours left in it; fire later and it
stops being a reminder and becomes a verdict. It goes to everyone with a live
challenge, not just partnered users — someone doing this alone has nobody who
will be told they slipped, which makes their own reminder the only thing between
them and a quietly broken streak.

Copy leads with the streak when there is one to lose, because "log it" is a
chore and "your 4-day streak" is a reason.

### Phase 4 — the local-day fixes underneath all of it

`202608211300_local_day_and_nudge_state.sql`. "Today" was computed in UTC
everywhere the client reads and in the user's own timezone everywhere the cron
sweeps read. Those disagree for five and a half hours a night in Asia/Colombo,
where the current users are — so a 1am log would leave `checked_in_today` false,
putting a "Nudge them" button in front of a partner whose habit was demonstrably
done. Moved to local dates: `get_partner_status`, `notify_partner_on_checkin`,
`getTodayStatus` (now an RPC — the client could only ever offer UTC), and
`todayString` → `localDay` on the Challenges tab.

**One security fix, found on the way.** `get_partner_status` is a
security-definer function taking a user id, granted to `authenticated`, that
never checked the caller was asking about themselves — any signed-in user could
read any other user's partner, name, avatar and daily progress by passing their
id. Nothing in the app does that, but the shape is a plain IDOR and it cost two
lines. The guard has to permit `auth.uid() is null` explicitly, since that is how
the service role calls it.

Timezone capture moved to sign-in (`providers/app-provider.tsx`). Until now the
only thing that ever wrote `profiles.timezone` was the deadline settings screen,
so anyone who never opened it sat on the `UTC` default — one of the three live
profiles was in exactly that state, meaning their 8pm deadline fired at 1:30am
local.

---

## Verification

Every migration was applied, exercised and rolled back against production inside
a transaction. pg_net queues its requests in a table and the background worker
only picks up committed rows, so a rollback means the payloads below were
constructed and inspected but never sent.

**Sweeps**

| Test | Result |
| --- | --- |
| `sweep_missed_checkins()` first run | **2** (was `0`) |
| Payload | `Synth didn't check in yesterday` → Gayan, `Gayan didn't check in yesterday` → Synth, both routed to `/(tabs)/challenges` |
| Second run (de-dupe) | `0` |
| `sweep_daily_reminders()` inside window | **2** — *"Walk for 10 minutes every day — log it before 6:00pm."* |
| Second run (de-dupe) | `0` |
| Deadline 22:00, now 16:38 (too early) | `0` |
| Deadline 12:00, now 16:38 (passed) | `0` |

**Nudge — all five refusals plus the happy path**

| Case | Result |
| --- | --- |
| Gayan → Synth | `{"sent": true}`, *"Gayan nudged you / Walk for 10 minutes every day is still open today."* |
| Immediately again | `already_nudged` |
| `nudged_today` on partner status | `true` |
| Dinesh (state `invited`) | `no_partner` |
| Recipient at 01:10 local | `quiet_hours` |
| After recipient logs | `already_logged` |
| No JWT | raises `not authenticated` |
| Gayan reading Synth's status | raises `not your status` |

Production was re-checked afterwards and is byte-for-byte unchanged: sweep still
returns `0`, `daily_status` still empty, no new tables or functions, timezones,
deadlines and check-ins all as before, one cron job.

`tsc --noEmit` clean; 78 jest tests pass.

---

## Deploying

Order matters, and the second step is easy to forget:

```bash
supabase db push && supabase functions deploy send-push
```

**Expect immediate traffic.** Both live partners have missed 20 and 21 Aug, so
the first cron run after deploy (hourly, at `:05`) sends each of them a
"didn't check in yesterday" push. That is the feature working — but it is real
notifications to real devices, not a dry run.

---

## Open items

- Should a nudge be suppressed when the recipient already got the automated
  missed-day push that same day? Right now they would get both. Leaning yes —
  one interruption per bad day — but it needs a product call rather than a
  guess.
- `partner_nudges` is the first real signal of whether nudging changes
  behaviour. Worth reading after a week.
- `accountability_mode` on `user_challenges` is now genuinely dead: nothing
  reads it for meaning, and this was the second bug it has caused. It survives
  only because it is `NOT NULL` under a check constraint. Worth dropping in its
  own migration.
