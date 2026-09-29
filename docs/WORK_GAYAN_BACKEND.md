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

## 5. Split `accountability_mode` — it is doing two jobs

Two separate problems in one column.

**(a) The default is dead.** `202608131600` sets `accountability_mode text default 'solo'` on
`profiles` **and** on the challenge table. **Solo mode is removed** (master spec §1) — nothing can
be logged without a partner. Every one of those defaults is now wrong.

**(b) It holds the wrong value.** The **tone** value (`competitive` / `momentum` / `encouraging` /
`team`) — the onboarding "How do you want Choner to talk to you?" answer — is written into it from
**two** places, not one:
- `app/profile/edit.tsx:79`
- `app/onboarding/energy.tsx:34-51`, the single write that saves the whole onboarding quiz

That is not an accountability mode, and both writers need updating together.

**Do:** decide which meaning keeps the column, give the other its own, migrate existing rows, then
fix the defaults. Tell Dinesh which name the tone ends up under — he is touching both files.

**Done when:** one column, one meaning, no `'solo'` default anywhere.

---

## 6. `photo_status` column and a storage bucket  ·  *new*

**Prototype:** `O8 Add your photo`.

Neither exists. The live-photo screen has nowhere to write.

**Do:** a `photo_status` column with values meaning *photo confirmed* / *no photo*, plus a storage
bucket with RLS so a user writes only their own.

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

**Done when:** a 6-character code entered in the app joins the same challenge the link would have.

---

## 8. Edit profile writes three more columns

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
  commitment with a streak of commitments both partners kept.

When these unfreeze, **agree the schema in writing before either person starts.** The churn in this
project has been in the data model, not the UI.
