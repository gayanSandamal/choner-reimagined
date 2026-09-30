# Gayan — backend work

**Read `docs/CHONER_MASTER_SPEC.md` first.** It is the product as decided and explains *why* these
changes are what they are. This file is just the task list.

**Scope.** Everything here is independent of the Find and Challenges prototype reviews still in
progress, so none of it gets invalidated by decisions still to come. The "Do not start" list at
the end is the work that *would* get invalidated.

**Prototype:** https://claude.ai/artifact/4Sk5AwVK4f4BouSWks8gon
Open it, click the screen named in each task on the left rail, and read the notes panel on the
right — it carries the same reasoning plus the app file paths.

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

**Drafted:** `supabase/migrations/202609291000_reflections_own_only.sql` on branch
`DineshDoluweera/chore/db-migrations-handover`. One line. Not run.

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
`...1110_..._contract.sql` on branch
`DineshDoluweera/chore/db-migrations-handover`. Not run — no Docker here.**

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
once the app writes the new name. Either of us can land first.

**The contract step has a gate.** It refuses to run while any row has the two
columns disagreeing, because that means something is still writing the old name
and dropping the column would lose it. It also needs the four matching RPCs
re-issued against the new name — re-issue all four, not just the live one, or
a `db reset` replays an old body that no longer compiles.

**Two writers in the app, not one:** `app/profile/edit.tsx:79` and
`app/onboarding/energy.tsx:34-51`, the single write that saves the whole
onboarding quiz. Dinesh updates both in his fe10.

**Done when:** one meaning per column, no `'solo'` default anywhere, and the
contract migration's gate passes.

## 6. `photo_status` column and a storage bucket  ·  *new*

**Prototype:** `O8 Add your photo`.

Neither exists. The live-photo screen has nowhere to write.

**Do:** a `photo_status` column with values meaning *photo confirmed* / *no photo*, plus a storage
bucket with RLS so a user writes only their own.

**Drafted:** `supabase/migrations/202609291200_photo_status.sql`. Two things in it are judgement
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

**Drafted:** `supabase/migrations/202609291300_short_invite_code.sql`. The long token stays as the
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
