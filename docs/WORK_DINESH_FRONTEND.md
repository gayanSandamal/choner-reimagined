# Dinesh — frontend work

**Read `docs/CHONER_MASTER_SPEC.md` first.** This file is the task list; the spec explains why.

**Scope.** The 22 frozen screens: Launch, Account, Onboarding, plus Edit profile. Nothing left to
decide in the Find or Challenges reviews can reach back and change them. The "Do not build yet"
list at the end is the work that would get thrown away.

**Prototype:** https://claude.ai/artifact/4Sk5AwVK4f4BouSWks8gon
Every task names the screen. Open it in the left rail, tap through it, and read the notes panel.

**Blocked on Gayan:** tasks 5, 6 and 7 need his deep-link fix (his task 2) before they can be
tested end to end. Build the screens anyway; they are testable with the prototype's simulate
buttons in the meantime.

---

## A. Launch

### 1. Welcome — `app/(auth)/welcome.tsx`  ·  *biggest rewrite in the slice*
**Prototype: `L2 Welcome`**

| Now | Change to |
|---|---|
| `choner-logo.png`, 150x102 | the **wordmark only** — reuse `BrandMark`, as `SplashView` does |
| Headline `Turn "I should" into "I did"` | **delete** — it lives on the onboarding intro |
| Tagline `Somewhere, someone is counting on you to show up.` | **delete** |
| `label="SIGN IN"` uppercase, `pill`, `log-in-outline` icon | `Sign in`, sentence case, **no icon**, 18px radius, gradient |
| `label="SIGN UP"` uppercase, `pill`, `person-add-outline` icon | **`Create an account`**, sentence case, no icon, orange outline |
| `I have an invite code` ghost | keep |
| `<TermsFooter />` | **delete the call, then delete `components/auth/TermsFooter.tsx`** — Welcome is its only caller and the legal line is gone from every screen |

Three buttons, same height, width and radius as every other primary button in the app.

**Splash needs no change.** `components/SplashView.tsx` already matches.

---

## B. Account

### 2. Sign in — `app/(auth)/sign-in.tsx`
**Prototype: `A1 Sign in`** · already very close.
**No change needed for the legal line — there isn't one.** Decided 29 September: signing in is not
consent, it is proof of consent already given. The documents are reachable from Settings
(`app/settings/index.tsx:119-131`, which already lists all three).

### 3. Sign up — `app/(auth)/sign-up.tsx`
**Prototype: `A2 Sign up`**
- Delete the sub `Takes about a minute.`
- **No bottom legal line.** The tick box is what records consent, so it is the only place the
  agreement appears.
- **The tick box copy changes.** Now: `I agree to Choner's Terms, Privacy Policy, and Health
  Disclaimer.` — one flat string, nothing tappable.
  Becomes: `I agree to Choner's Terms of use, Privacy policy, Cookie policy and Health disclaimer.`
  with **each document its own link**. In React Native, nested `<Text onPress>` inside the label
  handles this; make sure tapping a link does not also toggle the tick box.
  - `Terms of use` → `/legal/terms`
  - `Privacy policy` → `/legal/privacy`
  - `Cookie policy` → `/legal/privacy` **for now** — there is no cookie policy screen. Flag it as
    content work; do not invent the page.
  - `Health disclaimer` → `/legal/health-disclaimer`
  The health disclaimer is in this list deliberately. Choner puts two strangers together to
  exercise, so it is the one document carrying real liability, and it only ever appeared here.

### 4. Verify email — `app/(auth)/verify-email.tsx`
**Prototype: `A3 Verify email`** · still on the old design system.
- `CHECK YOUR EMAIL` uppercase display → `Check your email`, 24px light, sentence case
- `RESEND EMAIL` uppercase + `pill` + mail icon → `Resend email`, standard filled
- `BACK TO SIGN IN` uppercase + `pill` + icon → `Back to sign in`, orange outline

### 5. Email verified — **new screen**  ·  *blocked on Gayan's task 2*
**Prototype: `A3a Email verified`**
Big tick, `You're verified.`, `Your email is confirmed and you're signed in.`, one **Continue**.
Continue always goes to the onboarding intro — verifying only ever happens right after sign-up, so
the profile is never complete yet. If they entered an invite code before signing up, Continue goes
to the invite result instead.

### 6. Link expired — **new screen**  ·  *blocked on Gayan's task 2*
**Prototype: `A3b Link expired`**
Covers a verification or reset link that expired or was already used. Asks for the email, because
the link does not carry it. Button is `Send a new link` or `Send a new reset link` depending on
where it came from, plus `Back to sign in` — a verified account can simply log in.

### 7. Forgot password — `app/(auth)/forgot-password.tsx`
**Prototype: `A4 Forgot password`**
- `FORGOT PASSWORD` uppercase → `Forgot password`
- placeholder `ENTER EMAIL` → `you@email.com`, with an `Email` label above
- `pill` input with a mail `leftIcon` → standard field
- `SEND RESET LINK` uppercase + pill + icon → `Send reset link`, standard filled

`AuthBackButton` is already correct.

### 8. Reset password — `app/(auth)/reset-password.tsx`
**Prototype: `A5 Reset password`**
- `SET NEW PASSWORD` → `Set new password`
- `Pick something memorable — at least 8 characters.` → `Choose a new password for your account.`
- placeholders `ENTER NEW PASSWORD` / `CONFIRM NEW PASSWORD` → bullets, with `New password` and
  `Confirm new password` labels above
- `SAVE PASSWORD` uppercase + pill + icon → `Save password`, standard filled
- **`router.replace('/(tabs)/home')` → `router.replace('/')`** so the index gate decides onboarding
  vs Home

### 9. Enter invite code — `app/invite/code.tsx`
**Prototype: `A6 Enter invite code`** · *code format is Gayan's task 7*
- Placeholder `e.g. 8f3a1c…` → `e.g. RUN4K7`, `maxLength={6}`
- Copy → `Enter the 6-character code from your friend's message or invite email and we'll pull you
  into the challenge.`
- Button stays disabled until something is typed

### 10. Invite result — `app/invite/[token].tsx`  ·  *routing is Gayan's task 3*
**Prototype: `A7 Invite result`**
The `needs-auth` state (line 78) has one `Continue` that sends people back to Welcome — a dead
stop, since Welcome also offers "I have an invite code", which they just used. Replace with **two
buttons styled exactly as on Welcome**: `Sign in` (filled) and `Create an account` (outline). The
pending token already survives via `setPendingInviteToken`, so both routes work.

---

## C. Onboarding

The app has **12 route files** for a **10-screen flow**, and one required screen is missing.

| Prototype | File | Action |
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
| — | `why.tsx` | **move out** |

### 11. Intro — `app/onboarding/index.tsx`
**Prototype: `O1 Intro`**
- Emoji `🤝 🎯 📈` → line icons `together`, `target`, `trend`
- Delete `Takes about a minute.`
- **Delete the `I'll explore on my own` button and the whole `onExplore` handler.** Everyone builds
  a profile — matching needs age and gender and there is no route back into those questions from
  Home. This also removes the only path that sets `onboarding_complete` with no answers.
- Line 21: `a stranger's app — one person` → full stop, no em dash

### 12. Remove the skips — `goal.tsx:26`, `struggle.tsx:25`, `age.tsx:30`
**Prototype: `O2`, `O3`, `O5`** · *pairs with Gayan's task 8*
Delete `label="Skip for now"` from all three. Ship this **after** Edit profile can write struggle,
age and gender — otherwise a wrong answer is permanent.

### 13. Copy pass — `struggle.tsx`, `style.tsx`, `energy.tsx`
- **Struggle:** subtitle → `Be honest. This is how Choner knows where to support you most.`
  **Delete** the reassurance line `This is more common than you think.`
- **Style:** subtitle → `This shapes how Choner supports you and how your partner challenge
  feels.` Button `This is me — let's go` → `This is me, let's go`. Keep the settings reassurance.
- **Energy:** `...based on this — no pressure either way.` → remove the em dash. First-week
  strings are `A gentle start: one small win at a time` / `A steady pace: build the habit as you
  go` / `A strong start: momentum from day one` — none may imply *daily*, because cadence is 1x,
  2x or 3x a week.

### 14. Reveal — `app/onboarding/reveal.tsx`
**Prototype: `O7 Reveal`**
- **Add a back button.** It is the only onboarding step with no way back, so an energy answer
  cannot be changed once you see what it produced.
- Row label `Your challenge` → **`Your struggle`**. "Challenge" means the commitment everywhere
  else.
- `SKIPPED_COPY` line 22: em dash → full stop
- 5 emoji → line icons

### 15. Add your photo — **new screen**  ·  *needs Gayan's task 6*
**Prototype: `O8 Add your photo`**, placed **after the Reveal**.
Live camera only, no gallery. Copy states it earns the badge and can be retaken later in Profile.
`Set up later` is allowed. The badge says **"Photo confirmed"** — never "verified" and never
anything implying identity verification.

### 16. Pick a challenge — `app/onboarding/challenge.tsx`
**Prototype: `O9 Pick a challenge`**
- **Delete the "Create your own" custom-habit path.** Line 84 already throws `Custom habits aren't
  available yet` — remove the UI rather than erroring.
- Six activities: Running, Jogging, Walking, Cycling, Yoga, Workouts
- Heading `Pick what you'll start with`
- 5 emoji → line icons
- **Same picker as `app/challenge/browse.tsx`. Build it once as a shared component.**

### 17. Partner choice — `app/onboarding/invite.tsx`  ·  *full rewrite*
**Prototype: `O10 Partner choice`**

The current screen contradicts several locked decisions:
- `Continue solo, for now` (line 299) — **solo mode is removed**
- A branch where Find is not offered at all (line 65) — Find is always offered
- Email invite, share link, resend, waiting states, `Looking for your partner…`,
  `Done — take me home` — **all of this belongs to the Find tab now**
- `Choner works best with two — but the choice is yours.` — solo language

Replace with: two cards, **Find the right partner** and **Invite someone you know**,
**select-then-Continue** (a single tap must not launch a search by accident). Continue hands over
to the **Find tab**, where the person taps the radar themselves — that is what stops them missing
the Find experience. The invite card opens the Find tab's invite screen.

### 18. Delete `app/onboarding/target.tsx`
Cut from onboarding. Its two questions (how much, how often) moved to the first plan, where both
partners agree them. Remove the route from `_layout.tsx` too.

### 19. Move `app/onboarding/why.tsx` out
**Prototype: `T1e Challenges: your why`**
Asked once, the moment the partner **accepts** the first session — not in onboarding.
- Delete the line `Gayan sees one of these, so they know what they are showing up for` — the why
  is **private** now
- Keep the whole set skippable where it lands

---

## D. Profile

### 20. Edit profile — `app/profile/edit.tsx`  ·  *pairs with Gayan's task 8*
**Prototype: `T4a Edit profile`**
Add **struggle, age and gender** fields. Energy is deliberately left out — it asks how you feel
*this week*, so it is re-asked, not edited.
**Check with Gayan first:** he is splitting `accountability_mode`, which this screen currently
writes the tone value into. Use whatever column name he lands on.

### 21. Edit your why — `app/modals/edit-why.tsx`
**Prototype: `T4b Profile: edit your why`**
Subtitle is the private framing: `One of these comes back to you each day, so the reason is there
on the hard days.` One em dash to clear.

---

## E. Cross-cutting

### 22. Emoji → line icons
`features/onboarding/constants.ts` holds 22 emoji. **Values and labels already match the prototype
exactly** — only the `icon` field changes:

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
| age bands | 🌱🌿🌳🍃🍂 | **none** — plain pills |

Plus emoji in `challenge.tsx` (5), `index.tsx` (3), `invite.tsx` (2), `reveal.tsx` (5),
`components/community/MilestoneRow.tsx` (1).

### 23. Em dashes
No long dashes in copy. In this slice the **user-facing** ones are: `reset-password.tsx:57`,
`onboarding/index.tsx:21`, `struggle.tsx:19`, `style.tsx:21`, `energy.tsx:78`, `reveal.tsx:22`,
`challenge.tsx:84`, `invite.tsx` (6), `why.tsx` (3). The rest across the repo are inside `//`
comments — leave them.

### 24. The language flow — a rule, not a task

`Choner_Emotional_Start_to_Commitment_Language_Flow.md`, applied to all three prototypes on
29 September and written up in master spec section 8.

**The rule: the word "commitment" does not appear before two people have agreed a plan.**

Almost all of it lands on **Home and Challenges**, which are in "Do not build yet" below — so
there is nothing to do in this slice except know the rule before writing any new copy. The strings
themselves are in the master spec table and in the prototypes.

**One open question for this slice.** Onboarding's picker (`app/onboarding/challenge.tsx`, `O9 Pick
a challenge`) is the same six-activity choice as the empty-Challenges state, which now reads "Start
something together / Pick what you want to do with your partner. / [Let's do this]". Onboarding was
deliberately left alone, because at that point the person has no partner and no tab to hand off to,
and "Pick a challenge" is a step in a sequence rather than an empty state. Decide before fe6
whether the two should read the same.

**One thing left unreconciled, and it is not in this slice.** "Let's do this" is now both the
empty-Challenges button and the accept-this-person button on the Find match screen. They are never
on screen together, but it is the same phrase for "pick an activity" and "accept this human". The
language doc assigns it to the first, so the Find match screen is the one that should change if
either does. Raise it in the Find review.

---

## Do not build yet

Decisions still landing in the Find and Challenges reviews.

- **Home hero states** — `app/(tabs)/home.tsx`
- **The Find form** — `app/(tabs)/find.tsx`, `app/find/form.tsx` (mode question, conditional
  locations, 68-item dropdown)
- **Every Challenges screen** — `app/(tabs)/challenges.tsx`, `app/challenge/browse.tsx`
- **The invite screen** — `app/group/invite.tsx`
- **Plan a session, Session details, QR** — these are now proposal-based and the schema does not
  exist yet
