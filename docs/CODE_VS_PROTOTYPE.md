# Code vs the splash-to-Home prototype — every difference

Cross-referenced 2026-09-29 against prototype **Version 29**
(https://claude.ai/artifact/4Sk5AwVK4f4BouSWks8gon) by reading each file in the repo.

**Scope.** The 22 frozen screens only: Launch, Account, Onboarding, plus Edit profile. The Home
hero states and every Find / Challenges screen are deliberately **not** listed as work here. See
the "Do not build yet" section at the end.

**The Find and Challenges reviews have since finished** (2026-09-29 evening). What they decided is
in `docs/DECISIONS_LOG.md`, and the schema they need is agreed in `docs/SCHEMA_CHALLENGES.md`. This
file has not been re-diffed against those decisions, so read it as the frozen-slice diff it is —
not as the state of Challenges.

**D** = Dinesh (frontend) · **G** = Gayan (backend)

---

## 0. Gayan's list, in one place

Everything tagged **[G]** below, pulled out so it can be worked from on its own. Ordered by what
breaks without it. Every item is independent of the Find and Challenges reviews, so none of it
gets invalidated by decisions still to come.

**Broken today**

1. **Deep links never create a session.** `lib/supabase.ts:15` sets `detectSessionInUrl: false`
   and nothing reads the tokens out of the link. Email verification and password reset are both
   dead ends: the person taps the link, lands back on "Check your email" not signed in, with
   Resend disabled because the link carries no email. Read the tokens, create the session, then
   route. Add `choner://verify-email` and `choner://reset-password` to the Supabase allowed
   redirect URLs, or Supabase sends people to the Site URL instead of the app.
   *Unblocks:* Email verified and Link expired (new screens), and Reset password.

2. **New invitees get an account with no profile.** `app/invite/[token].tsx:67` does
   `router.replace('/onboarding/why')` for everyone. Someone who signed up two minutes ago reaches
   Home with no goal, struggle, style, age, gender or energy — everything matching and the app's
   tone depend on. New account → onboarding intro (skip the challenge picker and starting point,
   they inherit their partner's challenge); existing account → the why.

3. **The invitee path never sets `onboarding_complete`.** Confirm the index gate does not bounce
   them back into onboarding on their next launch.

4. **Notifications crash on web.** `lib/notifications.ts` guards only against Expo Go, so
   `getLastNotificationResponse` is called on web where it does not exist. Add
   `Platform.OS === 'web'`.

**Data leak**

5. **The why is readable by the partner.** `challenge_reflections` has correct own-only policies
   in `202608131000`, but `202608131600_partner_path_single_challenge.sql:518` adds
   **`challenge_reflections_partner_select`**. The why was made private on 27 September and the
   UI that showed it has been removed, so the policy is now a leak with nothing using it.
   **Drop it.** One line, do it first.

**Wrong model**

6. **`accountability_mode` is doing two jobs, and its default is dead.** `202608131600` sets
   `accountability_mode text default 'solo'` on profiles *and* on the challenge table, but **solo
   mode is removed** — every one of those defaults is now wrong. Separately,
   `app/profile/edit.tsx:79` writes the **tone** value (`competitive` / `momentum` /
   `encouraging` / `team`) into that same column. One column, two unrelated meanings. Split it,
   then fix the defaults.

**New schema**

7. **`photo_status` column and a storage bucket.** Neither exists. The live-photo screen has
   nowhere to write. Values are "photo confirmed" / "no photo" — never anything implying identity
   verification.

8. **Short invite code.** Today the code IS `challenge_invites.token`, a 36-character UUID that
   only ever appears in the invite email. Needs a 6-character code with an activity prefix
   (`RUN4K7`) that can be shown and typed inside the app.

9. **Edit profile writes.** `app/profile/edit.tsx:78-79` writes only `primary_goal` and
   `accountability_mode`. Add `main_struggle`, `age_range` and `gender` — the columns already
   exist. This ships together with removing the onboarding skips, because it is what makes those
   answers recoverable.

**Do not start:** session proposals, the Find mode column, the Challenges rebuild. See section 6.

---

## 1. Launch

### Splash — `app/index.tsx`, `components/SplashView.tsx`
Matches. `SplashView` already renders the `BrandMark` wordmark alone on paper, which is what the
prototype specifies, and the hold-then-route logic matches the prototype's note. **No change.**

### Welcome — `app/(auth)/welcome.tsx`  **[D]** — largest single rewrite in the slice
| Now | Should be |
|---|---|
| `choner-logo.png` image, 150x102 | the **wordmark only** (`BrandMark`, as the splash uses) |
| Headline `Turn "I should" into "I did"` | **removed** — it lives on the onboarding intro |
| Tagline `Somewhere, someone is counting on you to show up.` | **removed** |
| `label="SIGN IN"`, uppercase, `pill`, `log-in-outline` icon | `Sign in`, sentence case, **no icon**, standard 18px radius |
| `label="SIGN UP"`, uppercase, `pill`, `person-add-outline` icon | **`Create an account`**, sentence case, no icon, orange outline |
| `I have an invite code` ghost | unchanged |
| `<TermsFooter />` | **removed from this screen** (moves to Sign in and Sign up) |

Three buttons, same height, width and corner radius as every other primary button in the app.

---

## 2. Account

### Sign in — `app/(auth)/sign-in.tsx`  **[D]** — very close already
- Add the legal line at the **bottom**, under the "New here? Create an account" switch:
  `By continuing you agree to our / Terms of use, privacy and policy & cookie policy`
- Line 23: em dash in a `//` comment. Cosmetic only, not user-facing.
- Everything else matches: heading, fields, Forgot password link, inline `formError`, gradient
  button, `router.replace` on the switch.

### Sign up — `app/(auth)/sign-up.tsx`  **[D]**
- `AuthHeading ... sub="Takes about a minute."` → **remove the sub entirely**
- Add the legal line at the bottom: `By creating an account you agree to our / ...`
- **OPEN ITEM:** the screen then states the agreement twice, as the tick box and as the line. One
  should go, and the tick box is the one that records consent. Not yet decided.
- Everything else matches, including the confirm-password field.

### Verify email — `app/(auth)/verify-email.tsx`  **[D]** + **[G]**
| Now | Should be |
|---|---|
| `CHECK YOUR EMAIL` uppercase, `fonts.display`, letterSpacing 1.5 | `Check your email`, 24px light, sentence case |
| `RESEND EMAIL` uppercase + `pill` + mail icon | `Resend email`, standard filled button |
| `BACK TO SIGN IN` uppercase + `pill` + icon | `Back to sign in`, orange outline |

**[G]** The real bug: tapping the link never signs anyone in. `lib/supabase.ts:15` has
`detectSessionInUrl: false` and nothing reads the tokens from the link, so the person lands back
here, not signed in, with Resend disabled (the link carries no email). Read the tokens, create the
session, then show the screen below. Add `choner://verify-email` and `choner://reset-password` to
the Supabase allowed redirect URLs.

### Email verified — **DOES NOT EXIST**  **[D]**
New screen (prototype A3a). Big tick, `You're verified.`, `Your email is confirmed and you're
signed in.`, one **Continue**. Continue always goes to the onboarding intro — verifying only ever
happens right after sign-up, so the profile is never complete. If they entered an invite code
before signing up, Continue goes to the invite result instead.

### Link expired — **DOES NOT EXIST**  **[D]**
New screen (prototype A3b). Covers a verification or reset link that expired or was already used.
Asks for the email, because the link does not carry it. `Send a new link` /
`Send a new reset link` depending on where it came from, plus `Back to sign in`.

### Forgot password — `app/(auth)/forgot-password.tsx`  **[D]**
| Now | Should be |
|---|---|
| `FORGOT PASSWORD` uppercase display | `Forgot password`, sentence case |
| placeholder `ENTER EMAIL` | `you@email.com` |
| `pill` input with a mail `leftIcon` | standard field with an `Email` label above it |
| `SEND RESET LINK` uppercase + pill + icon | `Send reset link`, standard filled |

`AuthBackButton` is already there and correct.

### Reset password — `app/(auth)/reset-password.tsx`  **[D]** + **[G]**
| Now | Should be |
|---|---|
| `SET NEW PASSWORD` uppercase | `Set new password`, sentence case |
| `Pick something memorable — at least 8 characters.` | `Choose a new password for your account.` (**also removes an em dash**) |
| placeholders `ENTER NEW PASSWORD` / `CONFIRM NEW PASSWORD` | bullets, with `New password` and `Confirm new password` labels above |
| `SAVE PASSWORD` uppercase + pill + icon | `Save password`, standard filled |
| `router.replace('/(tabs)/home')` hardcoded | `router.replace('/')` so the index gate decides onboarding vs Home |

**[G]** Same deep-link bug as verification: without a session from the link, `updatePassword`
fails.

### Enter invite code — `app/invite/code.tsx`  **[D]** + **[G]**
- Placeholder `e.g. 8f3a1c…` and the 36-character token → **6-character code**, `e.g. RUN4K7`,
  `maxlength=6`
- Copy: `Paste the code from your invite email` → `Enter the 6-character code from your friend's
  message or invite email and we'll pull you into the challenge.`
- **[G]** Today the code IS `challenge_invites.token`, a 36-char UUID that only appears in the
  invite email. Needs a short code with an activity prefix, surfaced in the app.

### Invite result — `app/invite/[token].tsx`  **[D]** + **[G]**
- Line 78, the `needs-auth` state: one `Continue` that sends people back to Welcome →
  **two buttons, `Sign in` (filled) and `Create an account` (outline)**, styled exactly as on
  Welcome. The pending token already survives via `setPendingInviteToken`, so both routes work.
- **[G]** Line 67, the real bug: success does `router.replace('/onboarding/why')` for *everyone*.
  A brand-new invitee reaches Home with no goal, struggle, style, age, gender or energy. Split it:
  new account → onboarding intro (skipping the challenge picker and starting point, since they
  inherit their partner's challenge); existing account → the why.
- **[G]** The invitee path never sets `onboarding_complete`. Confirm the index gate does not bounce
  them back into onboarding on the next launch.

### Terms / Privacy / Health — `app/legal/*`  **[D]**
Prototype shows one screen with three segmented tabs. The app has three separate routes. Either is
fine; match whichever you build. `privacy.tsx` contains an arrow glyph and an em dash to clean up.

---

## 3. Onboarding

The app has **12 route files** for what is now a **10-screen flow**, and one required screen is
missing entirely.

| Prototype | App file | Action |
|---|---|---|
| O1 Intro | `index.tsx` | edit |
| O2 Goal | `goal.tsx` | remove skip |
| O3 Struggle | `struggle.tsx` | remove skip, copy |
| O4 Style | `style.tsx` | copy |
| O5 About you | `age.tsx` | remove skip |
| O6 Energy | `energy.tsx` | copy |
| O7 Reveal | `reveal.tsx` | back button, copy |
| O8 Add your photo | **missing** | **build** |
| O9 Pick a challenge | `challenge.tsx` | remove custom habit |
| O10 Partner choice | `invite.tsx` | rewrite |
| — | `target.tsx` | **delete** |
| — | `why.tsx` | **move out of onboarding** |

### Intro — `app/onboarding/index.tsx`  **[D]**
- Emoji promise icons `🤝 🎯 📈` → line icons `together`, `target`, `trend`
- `Takes about a minute.` → **remove**
- **`I'll explore on my own` button and the whole `onExplore` handler → remove.** Everyone builds a
  profile: matching needs age and gender and there is no route back into those questions from
  Home. This also removes the only path that sets `onboarding_complete` without any answers.
- Promise description line 21: `a stranger's app — one person` → full stop, no em dash
- `ProgressDots current={1}` is correct; dots run 1 to 6 across the intro and the five steps

### Goal / Struggle / About you — `goal.tsx:26`, `struggle.tsx:25`, `age.tsx:30`  **[D]**
**Remove `label="Skip for now"` from all three.** Each answer is required. Goal orders the
challenges offered later; struggle shapes the reveal; age and gender drive matching, and gender
already offers "Prefer not to say", which is the proper opt-out. A skipped answer was previously
unrecoverable, which is why Edit profile has to gain those fields (below).

### Struggle — `struggle.tsx`  **[D]**
- Subtitle: `Be honest — this is how Choner knows...` → `Be honest. This is how Choner knows where
  to support you most.`
- **Remove** the reassurance line `This is more common than you think.`

### Style — `style.tsx`  **[D]**
- Subtitle → `This shapes how Choner supports you and how your partner challenge feels.`
- Button `This is me — let's go` → `This is me, let's go`
- Keep `You can change this any time in your settings.`

### Energy — `energy.tsx`  **[D]**
- Subtitle: `...based on this — no pressure either way.` → remove the em dash
- Button is `See my profile`, and this is the screen that saves everything

### Reveal — `reveal.tsx`  **[D]**
- **Add a back button** — it is the only onboarding step with no way back, so an energy answer
  cannot be changed once you see what it produced
- Summary row label `Your challenge` → **`Your struggle`**. "Challenge" means the commitment
  everywhere else in the app
- `SKIPPED_COPY` line 22: `You skipped this — Choner adapts as you go` → full stop
- 5 emoji to replace with line icons

### Add your photo — **DOES NOT EXIST**  **[D]** + **[G]**
New screen (prototype O8), placed **after the Reveal**. Live camera only, no gallery. Earns the
badge, labelled **"Photo confirmed"** — never "verified" and never anything implying identity
verification, because Choner only checks the photo was taken live, not who is in it. Copy states
it can be retaken later in Profile. `Set up later` is allowed and leaves no photo.

**[G]** There is **no `photo_status` column and no storage bucket**. Both are new.

### Pick a challenge — `challenge.tsx`  **[D]**
- **Remove the "Create your own" custom-habit path** — custom challenges were cut. Line 84 already
  throws `Custom habits aren't available yet`; delete the UI rather than erroring
- Six activities: Running, Jogging, Walking, Cycling, Yoga, Workouts
- 5 emoji → line icons
- Heading `Pick what you'll start with`
- **This is the same picker as `app/challenge/browse.tsx`. Build it once as a shared component.**

### Partner choice — `invite.tsx`  **[D]** — full rewrite
The current screen is the old partner path and contradicts several locked decisions:
- `Continue solo, for now` (line 299) → **solo mode is removed**
- A branch where "Find is not offered at all" (line 65) → Find is always offered
- Email invite, share link, resend, waiting states, `Looking for your partner…`, `Done — take me
  home` → **all of this belongs to the Find tab now.** Onboarding never runs a search and never
  sends an invite
- `Choner works best with two — but the choice is yours.` → solo language, remove
- 8 em dashes, 2 emoji

Replace with the prototype's O10: two cards, **Find the right partner** and **Invite someone you
know**, select-then-**Continue** (a single tap must not launch a search by accident). Continue
hands over to the **Find tab**, where the person taps the radar themselves — that is what stops
them missing the Find experience. The invite card opens the Find tab's invite screen.

### Starting point — `target.tsx`  **[D]** — **delete**
Cut from onboarding. Its two questions (how much each time, how often) moved to the first plan,
where both partners agree them together. Remove the route from `_layout.tsx` too.

### Your why — `why.tsx`  **[D]**
**Move out of onboarding.** It is now asked once, the moment Gayan *accepts* the first session.
- Remove `Skip for now` from the onboarding stack position; the whole set stays skippable where it
  lives now
- Remove the line `Gayan sees one of these, so they know what they are showing up for` — the why
  is **private**
- 3 em dashes

---

## 4. Profile

### Edit profile — `app/profile/edit.tsx`  **[D]** + **[G]**
Writes only `primary_goal` and `accountability_mode` (lines 78-79), plus name and photo.
**Add struggle, age and gender.** Without them those three are set once at onboarding and can never
be corrected, and matching depends on age and gender. This is what makes removing the onboarding
skips safe, so the two changes ship together.

Energy is deliberately left out: it asks how you feel *this week*, so it is re-asked, not edited.

### Edit your why — `app/modals/edit-why.tsx`  **[D]**
Reached from Profile. Subtitle should be the private framing already there: `One of these comes
back to you each day, so the reason is there on the hard days.` 1 em dash.

---

## 5. Cross-cutting

### Emoji to line icons  **[D]**
`features/onboarding/constants.ts` holds 22 emoji. The values and labels all match the prototype
exactly — only the `icon` field changes:

| value | now | icon key |
|---|---|---|
| move_more | 🏃 | `run` |
| sleep_better | 🌙 | `sleep` |
| reduce_stress | 🌱 | `leaf` |
| improve_energy | ⚡ | `bolt` |
| start_but_stop | 🔄 | `redo` |
| lack_accountability | 👥 | `community` |
| too_busy | ⏰ | `clock` |
| overwhelmed | 😔 | `cloud` |
| competitive | 🏆 | `trophy` |
| momentum | 🔥 | `fire` |
| encouraging | 💬 | `chat` |
| team | 🤝 | `together` |
| low | 😴 | `sleep` |
| medium | ⚡ | `bolt` |
| high | 🔥 | `fire` |
| age bands | 🌱🌿🌳🍃🍂 | **none** — the prototype uses plain pills |

Also emoji in `app/onboarding/challenge.tsx` (5), `index.tsx` (3), `invite.tsx` (2),
`reveal.tsx` (5) and `components/community/MilestoneRow.tsx` (1).

### Em dashes  **[D]**
No long dashes anywhere in copy. **32 files contain one.** In the frozen slice the *user-facing*
ones are: `reset-password.tsx:57`, `onboarding/index.tsx:21`, `struggle.tsx:19`, `style.tsx:21`,
`energy.tsx:78`, `reveal.tsx:22`, `challenge.tsx:84`, `invite.tsx` (6 in copy), `why.tsx` (3).
The rest are inside `//` comments and can be left alone.

### `accountability_mode` defaults to `'solo'`  **[G]**
`202608131600` sets `accountability_mode text default 'solo'` on profiles and on the challenge
table. **Solo mode is removed.** Every one of those defaults is now wrong, and
`app/profile/edit.tsx` writes this column as the *tone* value, which is a second problem: the
column is doing two jobs.

### Notifications crash on web  **[G]**
`lib/notifications.ts` guards only against Expo Go, so `getLastNotificationResponse` is called on
web where it does not exist. Add `Platform.OS === 'web'`.

### The why is partner-readable  **[G]**
`challenge_reflections` has correct own-only policies in `202608131000`, but
`202608131600_partner_path_single_challenge.sql:518` adds
**`challenge_reflections_partner_select`**. The why is private now. **Drop that policy.**

---

## 6. Do not build yet

Written while the Find and Challenges reviews were still open. Both are now closed: the schema is
agreed in `docs/SCHEMA_CHALLENGES.md`, so the Challenges items below are unblocked, and the rest of
what changed is in `docs/DECISIONS_LOG.md` under "Challenges review, parts 1—6".

- **Session proposals.** Planning is now propose → accept / counter. There is no pending-session
  concept in the schema at all.
- **Mode on the Find form** (`in_person` / `separate` / `either`) as a hard filter, and the
  location question becoming conditional on it.
- **`app/(tabs)/challenges.tsx`** rebuilt to weekly shared commitments. The code is a 7-day
  challenge with daily task check-ins; the decided product is a rolling weekly commitment.
- **Home hero states**, `app/(tabs)/find.tsx`, `app/find/form.tsx`, `app/challenge/browse.tsx`,
  `app/group/invite.tsx`.
