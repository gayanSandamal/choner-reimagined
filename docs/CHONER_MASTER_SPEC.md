# Choner — master spec

**Status:** current as of 2026-09-29. This is the product as decided, not a history of how we got
here. Where the code contradicts this document, **this document wins** and the code is the thing
to change.

**Audience:** both founders and any AI assistant working on the codebase. If you are picking up a
task, read sections 1-3 before touching anything — most of the bugs we have found came from a
screen doing a job that belongs to another tab.

**Companion documents**
| File | What it is |
|---|---|
| `docs/CODE_VS_PROTOTYPE.md` | Screen-by-screen diff between this spec and the current code |
| `docs/WORK_GAYAN_BACKEND.md` | Gayan's task list with acceptance criteria |
| `docs/WORK_DINESH_FRONTEND.md` | Dinesh's task list with acceptance criteria |
| `docs/DECISIONS_LOG.md` | The dated record of every decision **and what was rejected**. Gitignored, so it will not appear in a clone |
| `docs/PROTOTYPE_HANDOVER.md` | How to rebuild the prototypes from source |

**The prototypes are the visual spec.** They are interactive, every button works, and every screen
carries a notes panel on the right explaining what the app should do and where the code lives.

| Prototype | Link | Covers |
|---|---|---|
| Splash to Home | https://claude.ai/artifact/4Sk5AwVK4f4BouSWks8gon | Auth, onboarding, Home, all four tabs |
| Home states | https://claude.ai/artifact/CjFJ8NDqEAQaND14Ej99W2 | Every Home state by preset |
| Challenges tab | https://claude.ai/artifact/6ZrGVeuv7gRSoP2tmWkRav | Day-of flow, misses, repair, move, cancel, end |
| Find & Challenges | https://claude.ai/artifact/YLKUahXoetAvC6JK2Kzw7M | The original Find flow |

---

## 1. The product

Choner pairs two people around a shared commitment and keeps them showing up for each other.

**The unit is a weekly shared commitment**, not a 7-day challenge with daily tasks. "Run 2x a
week." The current code implements the old model and has to be rebuilt.

- **The streak counts commitments both partners kept.** Never days. Never one person's activity.
- **Weeks run Monday to Sunday.** Week 1 is scaled from the match day to Sunday, so a pair matched
  on Friday with a 3x cadence owes fewer that week.
- **One session is planned at a time.** The next is planned the moment the current one is done.
- **One active challenge per user.** To change activity or cadence you end it and start another.
- **One repair per week.** A missed commitment ends the streak, but one extra session within three
  days, completed by both, carries the old count forward.
- **No solo mode.** Nothing can be logged without a partner. Every code path that offers going
  solo is removed.
- **Cadence is 1x, 2x or 3x a week**, agreed once by both people at the first plan.
- **Two modes per session:** Together (meet up, confirm with a QR code) or Separately, together
  (same commitment, own place, own time).

### Why this matters for the schema
The old model stored a challenge with an end date and daily task check-ins. The new one needs a
rolling challenge with no end date, sessions that belong to a week, and a streak derived from
sessions both people completed. `app/(tabs)/challenges.tsx` and its tables are a rebuild, not a
refactor.

---

## 2. Tab ownership — the rule everything hangs off

This is the single most important section. Nearly every bug found in review traced back to a
screen doing another tab's work.

> **Home may open a sheet ABOUT the commitment it is already showing** (Plan a session, Session
> details). **It may never open one that STARTS or ENDS another tab's lifecycle** — no partner
> search, no invite, no challenge picker. Those are a tab switch, landing on that tab's own top
> screen, never mid-flow.

| Tab | Owns |
|---|---|
| **Home** | the current commitment, and only that |
| **Find** | every partner path: search, invite, invite code, stop, switch, cancel |
| **Challenges** | the whole challenge lifecycle: create, end, cancel, history, sessions |
| **Community** | the feed |

**Tab order: Home, Challenges, Find, Community.**

### How to tell when this is being violated
If a screen's nav bar highlights a tab it is not filed under, it is in the wrong place. That
single tell exposed the invite screen, the challenge picker, and four more screens. In the
prototype, the left rail now groups every screen by its owner, and the HOME group holds exactly
one screen: Home itself.

### What this means in practice
Home's partner-less states carry **exactly one button**, and it only changes tab. Every label
names **what the user gets**, never where the button goes — see section 8.

| Home state | Button | Goes to |
|---|---|---|
| No partner | Find a partner | Find, top screen |
| Ended match | Find a partner | Find, top screen |
| Half-finished search | Find a partner | Find, which shows its own resume card |
| Searching | *no button* — a tappable "Searching" row | Find |
| Invited | See your invite | Find |
| Match found | See your match | Find |
| No challenge | Let's do this | Challenges, which owns the picker |

---

## 3. Screen map

38 screens. Phase codes match the prototype's left rail.

**Launch** — L1 Splash, L2 Welcome

**Account** — A1 Sign in, A2 Sign up, A3 Verify email, A3a Email verified\*, A3b Link expired\*,
A4 Forgot password, A5 Reset password, A6 Enter invite code, A7 Invite result, A8 Terms and privacy

**Onboarding** — O1 Intro, O2 Goal, O3 Struggle, O4 Style, O5 About you, O6 Energy, O7 Reveal,
O8 Add your photo\*, O9 Pick a challenge, O10 Partner choice

**Home** — H1 Home

**Tabs** — T1 Challenges tab, T1a create a commitment, T1b plan a session, T1c session details,
T1d confirm with QR, T1e your why, T2 Find tab, T2a Who else is here, T2b two questions,
T2c searching, T2d invite someone, T3 Community, T4 Profile, T4a Edit profile, T4b edit your why

\* does not exist in the code at all.

---

## 4. Onboarding — 10 screens

Intro → Goal → Struggle → Style → About you (age + gender) → Energy → Reveal → Photo →
Pick a challenge → Partner choice.

**No skips.** Every answer is required. Goal orders the challenges offered later, struggle shapes
the reveal, and age and gender drive matching. Gender already offers "Prefer not to say", which is
the proper opt-out; skipping left no answer at all and there was no way to set it afterwards.
**This is why Edit profile must gain struggle, age and gender — the two changes ship together.**

**Onboarding never does another tab's work.** It does not run a search and does not send an
invite. The partner choice hands over to the Find tab, where the person taps the radar themselves.
This is deliberate: it keeps the excitement of the choice while making sure nobody skips the Find
experience.

**Everyone builds a profile.** "I'll explore on my own" was removed. There is no route back into
the age and gender questions from Home, so a skipped profile could never be repaired. The only way
to reach an empty Home is ending a challenge.

**The photo** is live camera only, no gallery. It earns a badge labelled **"Photo confirmed"**.
Never "verified", and never anything implying identity verification — Choner checks the photo was
taken live, not who is in it, and that is not a claim we can stand behind when two strangers meet
in person. It can be retaken later from Profile. "Set up later" is allowed.

**What onboarding writes:** primary_goal, main_struggle, accountability_mode (tone), age_range,
gender, energy, timezone, city, onboarding_complete. Then it creates the default challenge so Home
has something to show.

**Cut from onboarding:** the starting point screen (how much, how often — moved to the first
plan, where both partners agree it), and the why (moved to after the first session is accepted).

---

## 5. Find — the partner path

### The form, before any search
Three questions, in this order. **The order matters**, because the first one decides whether the
third is asked at all.

1. **How do you want to do this?** In person / Separately, together / Either works
2. **Gender preference** — No preference / Same gender only
3. **Your locations** — *only asked if they chose In person or Either*

### Mode is a hard filter, not a score
| | In person | Either | Separately |
|---|---|---|---|
| **In person** | yes | yes | **never** |
| **Either** | yes | yes | yes |
| **Separately** | **never** | yes | yes |

Nobody can match into a mode conflict and discover it at the first plan. This is also what makes
the location rule coherent: `Choner_Matching_Algorithm_v2_Scoring.md` §5.6 already specified that
zero shared location tags is a **hard block for together and irrelevant for separate** — a rule
that previously had no mode answer to key off.

### Locations
- **Maximum 2**, chosen from a **dropdown of all 68 locations**, grouped Colombo city (27) then
  Greater Colombo (41). **No free typing** — the list is the whole vocabulary, and a typed value
  outside it cannot be tagged or matched.
- Source of truth: `supabase/migrations/202609181900_location_corridors.sql`. Labels match
  `locations.value` exactly.
- Each pick becomes a closable chip. The dropdown disappears at two and returns if one is removed.
- Someone who picked Separately never sees this question, and their pool is not cut by geography.

### Invite and search are one at a time
Starting an invite stops a search and vice versa, with a confirm. Nobody ends up with two
partners. The invite code is **6 characters with an activity prefix** (`RUN4K7`), shown in the app
— not the 36-character `challenge_invites.token` that currently only appears in the invite email.

**The invite message names the activity only**: "Dinesh is challenging you to go for a run. Are
you up for it?" No distance, no cadence — an invite goes out *before* a partner exists and nothing
is agreed yet. Copy takes the message, the link and the code together, all three.

---

## 6. Challenges — the session lifecycle

### Planning is a proposal, not a fact
**Whoever plans first proposes the whole session: mode, day, time and place. The other accepts or
suggests another. Nothing is planned until both agree.**

There is no separate mode-conflict state, because only one person is ever setting the value. If
the responder counters with Separately, that is what happens — **Together needs both, Separately
can always be delivered by one person.** You cannot make someone turn up at a park.

Mode is asked on **every** plan, not agreed once, so a rainy or travel week can be done separately
without touching the match.

A pair where either side chose "Separately" in Find can never meet: the plan screen shows the mode
as a plain statement, asks for no place, and the day-of flow drops the QR step.

### Week and session states
Sessions are `planned` → `today` → `done` / `missed` / `cancelled`. A `repair` session is flagged
separately and does not count toward the weekly target.

- **Move** and **cancel** both need the other person to agree. Neither breaks the streak.
- **Missed** = no check-in by midnight of the planned day, local time.
- A one-sided miss is **recorded**: a reason from a short list plus an optional line. The partner
  sees a neutral message, never a blaming one.
- The plan screen says which one of the week it is ("Commitment 1 of 2 this week") whenever the
  cadence is 2 or 3, so it is clear why only one day is being asked for.

### The day of
**Together:** I'm on my way → I'm here → (both here) → Confirm with QR → Finish.
**Separately:** Done / Doing it later (counts if finished before midnight) / Can't today.

### History
Finished challenges only, **not tappable**. A journey timeline is explicitly out of scope for MVP.

---

## 7. The why

Asked **once**, the moment the partner **accepts** the first session — not during onboarding, and
not when one person confirms a plan. That is the moment the pair actually agree, which is what it
was always meant to follow.

**It is private.** Nobody sees anyone else's answers. It comes back only to the person who wrote
it, from Profile → "Why you're doing this". Four questions, three answers each plus "Something
else", at least one to continue, the whole set skippable.

**This has a data consequence:** `challenge_reflections` must be own-read only. The policy
`challenge_reflections_partner_select` in
`supabase/migrations/202608131600_partner_path_single_challenge.sql:518` is a leak and must be
dropped.

---

## 8. Design and copy rules

- **Canvas** white `#FDFCFB`. **Floating navy frame** `#001827` for the top bar and bottom nav,
  both floating with content scrolling beneath — no white layer behind either.
- **Orange gradient** `#FD8302 → #FD5B01` for primary buttons, 18px radius, full width. Secondary
  is an orange outline. Tertiary is a ghost.
- **Poppins** throughout.
- **Line icons only. No emoji anywhere.** `features/onboarding/constants.ts` currently holds 22
  emoji that need mapping to icon keys — the table is in `docs/CODE_VS_PROTOTYPE.md`.
- **No long dashes (—) in any user-facing copy.** 32 files contain one; the ones in `//` comments
  can stay.
- Sentence case for headings and buttons. No uppercase display headings, no pill buttons, no icons
  inside primary buttons.
- The button that creates an account says **"Create an account"** everywhere.
- **No legal line on any screen.** It is off Welcome, off Sign up (the tick box carries it) and
  off Sign in (signing in is not consent, it is proof of consent already given). The documents are
  reachable from Settings. `components/auth/TermsFooter.tsx` therefore has no callers left and is
  deleted.
- **Sign up's tick box names all four documents as separate links:** Terms of use, Privacy policy,
  Cookie policy, Health disclaimer. There is no cookie policy screen yet, so that link points at
  `/legal/privacy` for now.
- **A button names what the user gets, never where it goes.** "Find a partner", "See your match",
  "Let's do this" — never "Go to Challenges". Every Home button switches tab, so saying so adds
  nothing.
- Empty states say what to do. Never "no check-ins yet".

### The word "commitment" is earned

**Never use it before two people have agreed a plan.** A commitment is the *result* of choosing
something, finding someone and agreeing to show up — not a form handed to someone on arrival.
Five moments, each with its own voice:

| Moment | Heading | Supporting line | Button |
|---|---|---|---|
| Nothing picked | Start something together | Pick what you want to do with your partner. | Let's do this |
| Activity picked, no partner | Let's make it happen | Find someone who wants to do it too. | Find a partner |
| Partner accepted | You found your match | Now let's plan your first one. | Plan your first run |
| Both agreed a plan | You're in | You've got something to show up for together. | — |
| From then on | Your commitment | | |

Home and Challenges use the **same words** for the first moment, so the handoff reads as one step
rather than two. "What you've committed to." renders as the Challenges subtitle **only once a plan
is agreed**. Source: `Choner_Emotional_Start_to_Commitment_Language_Flow.md`.

Two collisions this created, both resolved and worth knowing:
- "You're in" belonged to the **invite-result** screen. That is an earlier moment, so it became
  "You're connected." and "You're in" moved to the agreement.
- Home had "You found a match" (awaiting an answer) and "You found your person" (accepted). The
  second became "You found your match", so the first became **"A match is waiting"** to keep them
  apart.

---

## 9. Known bugs in the current code

Each one is real, found by reading the code, and independent of anything still under review.

1. **Deep links never create a session.** `lib/supabase.ts:15` has `detectSessionInUrl: false` and
   nothing reads the tokens. Email verification and password reset are both dead ends.
2. **New invitees get an account with no profile.** `app/invite/[token].tsx:67` sends everyone to
   `/onboarding/why`.
3. **The invitee path never sets `onboarding_complete`.**
4. **Notifications crash on web.** `lib/notifications.ts` guards only Expo Go.
5. **The why is partner-readable.** See section 7.
6. **`accountability_mode` does two jobs.** It defaults to `'solo'` (a mode that no longer exists)
   in two tables, and the *tone* value is written into the same column from **two** places:
   `app/profile/edit.tsx:79` and `app/onboarding/energy.tsx:34-51`.
7. **Edit profile cannot reach three required answers** — struggle, age and gender.
8. **No `photo_status` column and no storage bucket.**
9. **The invite code is a 36-character UUID**, email-only.

---

## 10. Open — do not resolve silently

1. **An invitee who already has an active challenge enters a code.** End theirs, replace it, or
   block it? Recommendation was ask-then-replace, and block outright if already partnered.
2. **Does an unused invite code expire?**
3. **What the matching wait promises** — "usually a day or two" versus notify-on-match.
4. ~~Button label convention.~~ **Closed 29 September.** One convention: a button names what the
   user gets. "Go to Challenges" is gone — Home says "Let's do this", the same words Challenges
   uses. See section 8.
5. ~~Sign up states the agreement twice.~~ **Closed 29 September.** The tick box stays and carries
   all four document links; the legal line is gone from every screen. See section 8.
6. **"Either works" in the Find form.** Kept, but it exists for pool size rather than for the
   person choosing it, and it still asks for locations so it saves them nothing. Revisit if match
   rates are poor at launch.
7. **"Photo confirmed" vs "Photo verified"** — locked as "confirmed"
   (`Choner_31_Changes_Full_Detail.md` #2). Flagged when challenged, not overturned.

---

## 11. Build order

**Frozen and safe to build now** — 22 screens, Launch + Account + Onboarding + Edit profile.
Nothing left to decide in Find or Challenges can reach back and change them.

**Hold** — Home hero states, the Find form, every Challenges screen. These depend on decisions
still landing in the remaining prototype reviews.

**Agree the schema before either person starts a slice.** The churn in this project has been in
the data model, not the UI: mode-in-Find is a new column, the proposal model is a new table, the
private why is an RLS change. A frontend/backend split does not protect against that on its own.

One component note: onboarding's **Pick a challenge** (O9) and Challenges' **Create a commitment**
(T1a) are the same six-activity picker at two entry points. Different moments, same component.
**Build it once.**
