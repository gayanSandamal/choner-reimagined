# Gayan — backend work

**Read `docs/CHONER_MASTER_SPEC.md` first.** It is the product as decided and explains *why* these
changes are what they are. This file is just the task list.

**Scope.** Everything here is independent of the Find and Challenges prototype reviews still in
progress, so none of it gets invalidated by decisions still to come. The "Do not start" list at
the end is the work that *would* get invalidated.

**Prototype:** https://claude.ai/artifact/4Sk5AwVK4f4BouSWks8gon
Open it, click the screen named in each task on the left rail, and read the notes panel on the
right — it carries the same reasoning plus the app file paths.

## Status, 1 October

Everything below was verified against the live project, not just the repo.

| Task | State |
|---|---|
| 1. Why is own-only | Done. Policy dropped (`202609291000`) |
| 2. Deep links create a session | Done in the app (`components/auth/AuthLinkHandler.tsx`). **Still needs `choner://verify-email` and `choner://reset-password` in the Supabase allowed redirect URLs**, which can only be set in the dashboard |
| 3. Invitee routing | Done. New accounts go through onboarding with the invite kept, and skip the challenge picker |
| 4. Notifications on web | Done |
| 5. Tone column | Done. `profiles.accountability_mode` is dropped on live |
| 6. Photo status | Done. Onboarding uploads through `set_live_photo()`; Profile can add or retake |
| 7. Short invite code | Done. The prefix is the activity (`202610011300`); the email function is deployed |
| 8. Edit profile fields | Done by Dinesh (fe5) |

Also applied on 1 October, from `docs/SCHEMA_CHALLENGES.md` and the testing pass:

- `get_my_match()` returns `expires_at` for the 24 hour countdown (`202610011000`)
- Workout exercises, up to four, never sent to matching (`202610011050`)
- The directory shows everyone, as an opt-OUT (`202610011100`)
- Someone already partnered is refused in words, in `accept_invite_by_code()` and `confirm_match()` (`202610011200`)

**Built on 1 October, later the same day. Each closed a question by the rule nearest to hand; the migration header says which:**

- **Pairing was broken, and is fixed (`202610012400`).** Since `202609301500` no two people could be paired at all: the one-partnership-per-person trigger rejected the second half of the SAME pair, so every invite acceptance and every match confirmation rolled back. It went unseen because the live database had no pairings to make. Found by pairing two people inside a rolled-back transaction.
- **The repair debt (`202610012100`, `...2500`).** `get_repair_debt()`, `set_repair_preference()`, `start_repair_plan()`. "The week" for two people in two timezones is answered the way `due_at` was: the pair runs on the clock of whoever has the later day. First miss of a week is owed, a second is lost, the debt lapses at the end of the following week, and the repair runs through the ordinary plan flow with `is_repair` set. There is no screen for it yet: that is Dinesh's task 17, and the hooks are in `features/plans/hooks.ts`.
- **Per-person amounts (`202610012000`).** Two different answers settle the step instead of opening a negotiation, and `confirm_plan()` asks that both have answered, not agreed. The app reads amounts through `features/plans/amounts.ts`: *"You 5 km · Gayan 3 km"*, or *"5 km each time"* when they match.
- **Jogging, and Cycling switched on (`202610012200`).** Jogging is its own activity, matched with joggers. The older goal-derived habits are untouched.
- **An invitee who is already on a challenge is asked first (`202610012300`).** `preview_invite()` says what accepting would do; the invite screen asks *Switch to their challenge?* before anything is replaced. An existing account signing back in with a pending invite is sent to that screen instead of being switched silently.

**Built on 1 October, the last round:**

- **The picker is the six activities (`202610020900`).** Running, Jogging, Walking, Cycling, Yoga, Workouts; every older habit is retired from the picker. Matching pairs by template id, so 476 existing challenges were MOVED onto the canonical template for their activity, or new runners would never have met the existing pool. The old template is kept in `legacy_template_id`. Challenges on a habit with no activity (water, journaling, the named programmes) were left where they are.
- **The shared cadence (`202610020910`, `...0930`).** A `cadence` field in the existing plan negotiation: one suggests, the other accepts, and it is written to the plan and to both challenges. Asked once per pair.
- **The streak (`202610020920`).** `set_streak_target()` and `get_streak()`, which returns exactly `target` circles. Complete when all N resolve, not when N fill.
- **Screens.** How often (plan flow), How long a streak (modal), the streak circles and the repair card on the Challenges tab, and the exercise picker for Workouts in onboarding.

**An outage, and the rule it leaves behind.** `202610020900` first added `legacy_template_id` as a foreign key. A second foreign key from `user_challenges` to `challenge_templates` makes every `challenge_templates(*)` embed ambiguous to PostgREST, and that embed is `getMyChallenge()`. Home, Challenges, Find and Profile failed for everyone, on every installed build, for roughly ten minutes until `202610020940` dropped the constraint. **Adding a second foreign key between two tables is a breaking API change here.**

**Built on 2 October:**

- **The Challenges tab is rebuilt** (`app/(tabs)/challenges.tsx`). The commitment card with its partner row, the session plan, the streak, the repair card and history. The daily screen it replaces is gone: no TODAY card, no "Mark as done", no "Day 5 of 7", no nudge, no solo panel, no partner why. Every state short of partnered hands off to Find with a button.
- **Create a commitment** (`app/challenge/browse.tsx`). The activity and nothing else, with up to four exercises for Workouts. The same screen changes the activity, and `set_challenge_habit()` now refuses once a search has started (`202610021030`).
- **Every activity plans sessions** (`202610021000`). `confirm_match()` only created a first plan for running, walking and cycling, so a Jogging, Yoga or Workouts pair was matched and had nothing to plan. Yoga and Workouts answer "how much" in minutes. The plan flow's words come from the activity (`features/plans/activity.ts`): nothing says "run" to someone doing yoga.
- **The sample pool is on the six** (`202610021010`). All 406 challenges on habits with no activity belonged to `@choner.test` accounts. They were spread across the six, which also gives Jogging and Cycling a pool for the first time. Guarded by email domain: a real account is never moved.
- **History carries the score** (`202610021020`): *Ended · 7 of 12 · September 2026*.

**Still not built:**

- **Home.** It is the last screen still on the daily model: the daily check-in, the old streak number and "log it before 8pm" all live there now and nowhere else. The daily reminder and missed-check-in cron jobs are still running to match. Home and those jobs should change together.
- **Ending a challenge the new way.** "End this challenge" still abandons the row. Keeping the partner across it, so the pair picks a new activity together, needs a way to carry a partnership onto a new challenge and is not built.
- **Find's matched screen.** End match, report and block belong there. Until it has them, the report and block menu stays in the Challenges top bar and `end_match()` has no button anywhere.
- **Session details** (Dinesh's task 15) and the Find rebuild (section C).

---

**Order.** Task 1 is one line and closes a data leak; do it first. Then 2-3, which unblock two
whole flows Dinesh cannot finish without you.

---

## 1. Drop the partner-read policy on the why  ·  *one line, do it first*

**Prototype:** `T1c Challenges: session details` — note the card that used to sit under the
session is gone.

`challenge_reflections` has correct own-only policies in
`supabase/migrations/202608131000_challenge_setup_why.sql:134-149`. But
`supabase/migrations/202608131600_partner_path_single_challenge.sql:518` then adds
**`challenge_reflections_partner_select`**, which lets a partner read the other person's answers.

The why was made private on 27 September and the UI that displayed it has been removed, so this
policy is now exposure with nothing using it.

**Do:** new migration dropping `challenge_reflections_partner_select`. Leave the four own-only
policies alone.

**Drafted:** `supabase/migrations/202609291000_reflections_own_only.sql`, on `main`.
One line. Not run.

**Done when:** a partner reading another user's `challenge_reflections` rows gets zero rows.

---

## 2. Make deep links create a session  ·  *blocks two flows*

**Prototype:** `A3 Verify email` (see the red note), `A3a Email verified`, `A3b Link expired`,
`A5 Reset password`.

`lib/supabase.ts:15` sets `detectSessionInUrl: false` and nothing in the app reads the tokens out
of the link. So:

- **Verification:** the account *is* verified on Supabase, but the app drops the person back on
  "Check your email", not signed in, with Resend disabled because the link carries no email. The
  only way forward is going to Sign in and logging in by hand.
- **Reset:** `updatePassword` fails outright, because there is no session.

**Do:**
1. Read the tokens from the incoming link and create the session.
2. Add `choner://verify-email` and `choner://reset-password` to the Supabase **allowed redirect
   URLs**, or Supabase sends people to the Site URL instead of the app.
3. Route after: verification → `A3a Email verified`; reset → the password form.
4. Handle the expired / already-used case → `A3b Link expired`. That screen asks for the email,
   because the link does not carry it.

**Done when:** tapping a fresh verification link opens the app signed in; tapping an expired one
reaches Link expired; reset completes and lands on `/` so the index gate decides onboarding vs Home
(it currently hardcodes `/(tabs)/home`).

**Note for Dinesh:** A3a and A3b do not exist as screens yet. He is building them.

---

## 3. Fix invitee routing  ·  *creates broken accounts today*

**Prototype:** `A7 Invite result` — read the note, it spells out both paths.

`app/invite/[token].tsx:67` does `router.replace('/onboarding/why')` for **everyone**. Someone who
signed up two minutes ago reaches Home with no goal, struggle, style, age, gender or energy —
everything matching and the app's tone depend on.

**Do:**
- **New account** → the onboarding intro. They answer goal, struggle, style, about you and energy,
  see the reveal and the photo step, then **skip the challenge picker and the starting point**
  (they inherit their partner's challenge) and finish on the why.
- **Existing account** → straight to the why, prefilled and skippable, then Home.
- **Set `onboarding_complete`** on this path. It currently never gets set, so confirm the index
  gate does not bounce them back into onboarding on their next launch.

**Done when:** a brand-new invitee who accepts a code reaches Home with a complete profile, and
relaunching does not restart onboarding.

---

## 4. Guard notifications on web

`lib/notifications.ts` guards only against Expo Go, so `getLastNotificationResponse` is called on
web where the module does not provide it. Add `Platform.OS === 'web'` to the same guard.

**Done when:** the web build loads with no console error from `ExpoNotifications`.

---

## 5. `accountability_mode` — and the task description was wrong

**Corrected 29 September after reading the migrations. Draft SQL is written:
`supabase/migrations/202609291100_profiles_tone_column_expand.sql` and
`...1110_..._contract.sql`, both on `main`. Neither is run — no Docker here.**

There are **two** columns called `accountability_mode` and they do **not** have
the same problem. The earlier version of this task conflated them.

**`profiles.accountability_mode` — holds the TONE.** `competitive` /
`momentum` / `encouraging` / `team`, the onboarding "How do you want Choner to
talk to you?" answer. It is also already *consumed* as the tone: four matching
RPCs read it as `coalesce(p.accountability_mode, 'encouraging') as style`
(`202608211400:38`, `202609182100:35`, `202609231000:440`, `202609231100:29`).
So nothing about its meaning is ambiguous in practice. Only two things are
wrong: the **name**, and the **`default 'solo'`** from `202603261510:29`, which
has been giving every new row a value nobody chose.

Worth knowing: `202603261510:23` renamed `accountability_style` →
`accountability_mode`. The original name was right. That rename is the bug.

**`user_challenges.accountability_mode` — genuinely a mode.** Holds
`solo` / `partner`, and roughly fifteen migrations plus every partner RPC
branch on `= 'partner'`. Solo mode is removed from the product, but unpicking
that touches the whole partner path, so it belongs to the **Challenges
rebuild**, not here. The draft only drops its dead `default 'solo'`
(`202603261600:49`) so new challenges stop being born solo.

**Why the draft is expand/contract.** A straight rename breaks every writer the
moment it lands and every reader the moment it does not, and we are working on
opposite sides of this column. So: add `accountability_style`, backfill, keep
both names in step with a trigger, and drop the old one in a second migration
once the app writes the new name.

### YOU LAND FIRST. This is the one ordering that is not negotiable.

An earlier version of this task said either of us could go first. That was
wrong, and it is the only hard sequencing constraint in your whole list:

    1. YOU run 202609291100 (expand)   <- nothing has run it; it is yours
    2. Dinesh merges and ships fe10
    3. YOU re-issue the matching RPC against accountability_style
       (DONE 30 Sept, 202609301700. Only get_match_pool() ever read
       profiles.accountability_mode; the other three of "four" were superseded)
    4. YOU set choner.allow_tone_contract = 'on' and run 202609291110

`accountability_style` does not exist until step 1. fe10 is written and waiting
— it writes the new name, so shipping it before step 1 means onboarding and
Edit profile both fail on save, against a column that is not there. Step 1 is
additive and safe to run on its own, today, before anything else in this task.

**The contract step's gate was rewritten on 30 September, because the first one
was not a gate.** It used to ask whether the two columns disagree. They cannot
disagree: the expand migration installs a trigger whose whole job is to keep
them in step, so the check passed by construction and would have let the column
be dropped out from under a live app. It now does two real things:

  - it is OPT-IN. It does nothing and raises a NOTICE unless you
    `set choner.allow_tone_contract = 'on'`. So `supabase db push` runs the
    other four drafts and skips this one
  - it scans `pg_proc` and REFUSES while any function still names
    `accountability_mode`. That is what enforces step 3 — re-issue all four
    matching RPCs, not just the live one, or a `db reset` replays an old body
    that no longer compiles

**Two writers in the app, not one:** `app/profile/edit.tsx` and
`app/onboarding/energy.tsx` (the single write that saves the whole onboarding
quiz). Both moved together in fe10, which also reads
`accountability_style ?? accountability_mode` so a row your backfill has not
reached still shows its tone instead of going blank.

**Done when:** one meaning per column, no `'solo'` default anywhere, and the
contract migration runs to completion with the opt-in set.

## 6. `photo_status` column and a storage bucket  ·  *new*

**Prototype:** `O8 Add your photo`.

Neither exists. The live-photo screen has nowhere to write.

**Do:** a `photo_status` column with values meaning *photo confirmed* / *no photo*, plus a storage
bucket with RLS so a user writes only their own.

**Drafted:** `supabase/migrations/202609291200_photo_status.sql`, on `main` and not run. Two
things in it are judgement
calls, so overrule them if you disagree:

1. **It reuses the `avatars` bucket** rather than making a new one. `202607311000` already created
   it with exactly these policies (public read, owner-only write/update/delete, keyed on
   `<user_id>/<file>`) and `profiles.avatar_url` already holds the URL. A second bucket is a second
   set of policies to keep correct for no gain.
2. **A gallery upload drops the badge.** Edit profile still uploads from the gallery
   (`app/profile/edit.tsx` uses `expo-image-picker`) into the same bucket and the same column, so
   without a rule a gallery photo would inherit a badge a live capture earned weeks earlier. Any
   change to `avatar_url` that did not come through `set_live_photo()` resets `photo_status`, and
   the badge cannot be set by hand at all. The badge is what a stranger reads before agreeing to
   meet someone in person, so it must not outlive the photo that earned it.

**Copy constraint that is also a product constraint:** the badge says **"Photo confirmed"**, never
"verified", and nothing in the data model should be named `verified` either. Choner checks the
photo was taken live, not who is in it — see master spec §4.

**Done when:** onboarding can upload, Profile can retake, and "Set up later" leaves a clean
no-photo state.

---

## 7. Short invite code

**Prototype:** `A6 Enter invite code`, `T2d Find: invite someone`.

Today the code **is** `challenge_invites.token`, a 36-character UUID that only ever appears in the
invite email. It cannot reasonably be read out, typed, or shown in the app.

**Do:** a 6-character code with an activity prefix (`RUN4K7`), unique, stored alongside the token
and resolving to the same invite. The long token can stay as the deep-link payload.

**Also:** invite and search are **one at a time** (master spec §5). Starting one cancels the other,
with a confirm. Enforce it server-side too, not just in the UI, or a race leaves someone with two
partners.

**Open, needs a decision before you build it:** what happens when someone who **already has an
active challenge** enters a code — end theirs, replace it, or block it? Recommendation was
ask-then-replace, and block outright if they are already partnered. Do not resolve this silently.

**Drafted:** `supabase/migrations/202609291300_short_invite_code.sql`, on `main` and not run.
It also carries the 48 hour code expiry. The long token stays as the
deep-link payload; the code sits beside it. The alphabet drops `O 0 I 1 L U`, input is normalised
so `run-4k7` works, and acceptance is a thin wrapper over `accept_challenge_invite` rather than a
ninth rewrite of a function that has been redefined eight times. The open question above is
restated at the bottom of the file, unresolved.

**Done when:** a 6-character code entered in the app joins the same challenge the link would have.

---

## 8. Edit profile writes three more columns  ·  *already done, check before you start*

**This is a frontend change and Dinesh has done it** in `feat/fe5-profile-fields`: all five answers
now round-trip through Edit profile, and no migration was needed because all three columns already
exist. Left here so the overlap is visible rather than built twice. What may still be yours is the
last line of this task, re-running matching preferences when age or gender changes.


**Prototype:** `T4a Edit profile`.

`app/profile/edit.tsx:78-79` writes only `primary_goal` and `accountability_mode`. Add
**`main_struggle`, `age_range`, `gender`** — all three columns already exist (`age_range` in
`20250324_initial.sql`, `gender` in `202609181600_activity_inputs_foundation.sql`).

**Why it is urgent:** Dinesh is removing the "Skip for now" buttons from onboarding in the same
cycle. Those two changes are a pair — the skips can only go if the answers are recoverable
afterwards. Without this, an answer is set once at onboarding and can never be corrected, and
matching depends on age and gender.

**Also:** changing age or gender should re-run matching preferences on the next search.

**Done when:** all five profile answers round-trip through Edit profile.

---

## Do not start

These depend on decisions still landing in the Find and Challenges reviews. Building them now
means building them twice.

- **Session proposals.** Planning is now propose → accept / counter (master spec §6). There is no
  pending-session concept in the schema at all.
- **Mode column on the Find form** (`in_person` / `separate` / `either`) and the hard-filter logic
  in matching.
- **`app/(tabs)/challenges.tsx` and its tables**, rebuilt to weekly shared commitments. The code
  is a 7-day challenge with daily task check-ins; the decided product is a rolling weekly
  commitment with a streak of SESSIONS both partners completed.

  **These are now unfrozen and the schema is agreed: read `docs/SCHEMA_CHALLENGES.md`.** It
  changes `user_challenges`, which task 5 already touches — read its §2 before that lands. It
  also names a live bug in `pair_plans`: `days_per_week in (3, 4, 5, 7)` rejects 1x and 2x.

When these unfreeze, **agree the schema in writing before either person starts.** The churn in this
project has been in the data model, not the UI.
