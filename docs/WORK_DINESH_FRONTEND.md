# Dinesh — frontend work

**Rewritten 1 October**, against the model as it stands after the Challenges review, the Find
walk and the testing pass. The version this replaces covered the 22 frozen screens; that slice is
**done and merged** (fe1–fe11, plus fe10). What is left is everything that used to sit under *Do
not build yet*, and it is now unfrozen.

**Read first:** `docs/CHONER_MASTER_SPEC.md` for the model, `docs/SCHEMA_CHALLENGES.md` for the
data it runs on. This file is the task list; those two say why.

**The prototypes are the visual spec.** Every task names its screen. Open it in the left rail,
tap it, and read the notes panel — the notes carry the reasoning, and several carry a
*Needs backend* line that tells you what is not there yet.

| Prototype | Link | What to open it for |
|---|---|---|
| Splash to Home | https://claude.ai/artifact/4Sk5AwVK4f4BouSWks8gon | Everything below except the Challenges internals |
| Challenges tab | https://claude.ai/artifact/6ZrGVeuv7gRSoP2tmWkRav | The day-of flow, misses, repair, move, cancel, end |
| Home states | https://claude.ai/artifact/CjFJ8NDqEAQaND14Ej99W2 | **STALE.** Still on the old model. Do not build from it |
| Find & Challenges | https://claude.ai/artifact/YLKUahXoetAvC6JK2Kzw7M | **STALE.** Superseded by Splash to Home |

---

## Before you start — three things to check

**1. Three branches were not merged.** As of this writing `main` does not contain:

    DineshDoluweera/docs/gayan-four-answers        the four schema answers
    DineshDoluweera/proto/editable-commitment      every prototype change from 30 Sept and 1 Oct
    DineshDoluweera/chore/note-test-harness-gap    the testing note

The second one matters most: **the prototype sources on `main` are several versions behind the
links above.** The artifacts are current; the repo is not. Merge them before anyone reads
`docs/prototypes/src/` and believes it.

**2. The expand migration.** `202609291100` adds `profiles.accountability_style`. fe10 is merged
and the app writes that column. If the migration has not been *run* against the database you are
pointing at, Edit profile and the onboarding energy screen fail on save. That is not a bug in your
code. Check before you debug it.

**3. Type errors already on `main`, not yours.** `npx tsc --noEmit` reports two:

    app/onboarding/challenge.tsx(70,19)   "/onboarding/partner"
    app/onboarding/reveal.tsx(102,38)     "/onboarding/photo"

Both screens exist; expo-router's generated route types are stale. Running the dev server once
regenerates them. Do that before you start, so a real error is visible when it appears.

---

## What is yours and what is his

The rule that decides every ambiguous case, from the spec §2:

    Home        owns the current commitment and hands off. It starts nothing.
    Find        owns EVERY partner path. Search, invite, invite code, stop,
                switch, cancel, the match itself, END MATCH, report, block.
    Challenges  owns the challenge lifecycle. Create, plan, the day of,
                misses, repair, move, cancel, end challenge, history.
    Community   read-only.

If you find yourself putting a partner action on Challenges or a challenge action on Find, that is
the bug, not the spec.

**Blocked on Gayan, and how hard:**

| You need | His task | Hard block? |
|---|---|---|
| `partnerships` table + `is_partner_of()` repointed | §2 of the schema doc | **Yes** — Section E cannot start |
| `target_sessions` on `user_challenges` | §4 | **Yes** — the streak circles are nothing without it |
| `'missed'`, `is_repair`, `repairs_plan_id` on `pair_plans` | §4 | **Yes** — Section F |
| `due_at` on `pair_plans` | §4 | **Yes** for misses, no for planning |
| `days_per_week` accepting 1 and 2 | §4, one line | **Yes** — the picker offers 1× today and the insert is rejected |
| A neutral `end_match` RPC | §5 | **No** — build the screen, wire it last |
| 24h match expiry, 48h code expiry | §4 | **No** — the clock is display-only until then |

Sections **A, B and part of C** depend on none of it. Start there.

---

# A. The intro — `app/onboarding/index.tsx`

**Prototype:** `O1 Intro` on Splash to Home. **Depends on nothing. Do it first.**

The one dark screen in a light app, and that is deliberate: it is a title card, not the start of a
dark theme. Decided 1 October, with a full dark mode as separate later work.

- Navy radial ground: `radial-gradient(140% 90% at 15% 0%, #0a3550 0%, #001827 40%, #001827 55%, #2a1206 92%, #1a0c05 100%)`
- A warm orange bleed rising from the bottom, and a softer one top-right. Both are decoration:
  `pointerEvents="none"`, behind the content
- **No glow behind the logo.** The mark is orange line art; a halo behind line art reads as a
  rendering artefact. This was asked for explicitly
- Logo unchanged, at its existing size
- Headline over two lines, with `"I did"` carrying the brand gradient. On React Native that is a
  `MaskedView` over a `LinearGradient`, not a CSS background-clip
- Sub-line, with the middle phrase at full white and the rest at 72%:
  *Choner helps you stay **consistent with the healthy habits** you want to build.*
- Three promise cards as glass: `rgba(255,255,255,.07)` on a `rgba(255,255,255,.09)` border.
  Copy is unchanged from what is there now
- Progress dots: white at 28%, the active one the gradient
- Button says **Build my profile**, with an arrow after the label

**Also:** the status bar goes light on this screen only. `expo-status-bar` with `style="light"`,
reverted on the next screen.

**Done when:** the intro is dark, the next screen is light, and nothing in between flickers.

---

# B. The commitment — create and edit

## 1. Create a commitment — `app/challenge/browse.tsx`
**Prototype:** `T1a Challenges: create a commitment`

This screen asks **the activity, and nothing else**. Not how much, not how often. Those are agreed
with the partner at the first plan, and asking here asks the same question twice — it is the
promise that deleted `app/onboarding/target.tsx`.

- Six activities: Running, Jogging, Walking, Cycling, Yoga, Workouts
- **Workouts then asks for up to FOUR exercises** (1 October). They are descriptive: they show on
  your card and in the directory, and they **never reach matching**. Cap at 4, disable the rest
- **Workouts are measured in minutes**, like Yoga. Not reps, not seconds. Four exercises on one
  commitment have no single rep count between them
- One line under the button: *You can change this until you start searching for a match.*
- On create, land on **Home**. Creating a commitment is a setup action and setup actions finish on
  Home, the same way onboarding does

## 2. Change the activity — new screen
**Prototype:** `T1b Challenges: change the activity`

The commitment card has carried the line *"You can change this until you start searching for a
match"* for a week and was not tappable. Make the card a button and give it somewhere to go.

- Activity, plus the four-exercise picker for Workouts. Nothing else is editable
- **Locked the moment `partner_state` is anything but solo** — searching, invited, matched,
  partnered. The card line becomes *Locked while you're looking for a match*
- Lock it on **both** tabs. The same card appears on Find

**Done when:** the card is tappable before a search and inert after one, on both tabs.

---

# C. The Find tab — `app/(tabs)/find.tsx`, `app/find/form.tsx`, `app/find/who-else.tsx`

**Prototype:** `T2 Find` and its sub-screens. The biggest section, and most of it is state work
rather than new screens.

## 3. The landing
- The radar is the landing. The directory is **not** inline — it was, from 29 September, and moved
  back out on 1 October
- One button under the radar: **Already on the move**, opening the directory. **No count on it.**
  We do not have a real number and a fabricated one is the kind of thing nobody remembers is
  fabricated
- The commitment card sits here too, activity only, locked once a search starts

## 4. Already on the move — `app/find/who-else.tsx`
- Its own screen, reached from that button
- **Six cards per screen**, not eight. Each card stands apart; this is not a joined list
- Name, avatar, activity, amount, cadence. **No location** — decided 29 September: without it this
  is a first name and an activity rather than a way to find someone in person
- Workout rows show their exercises. This is the only place exercises appear anywhere
- Everyone registered is shown **by default**. A new user has to see the app is alive
- At the end of the list, a spinner that never resolves. It is a deliberate small lie, so a short
  list feels alive. It is written down so nobody later reads it as a hang

**Needs backend:** `get_active_directory()` is gated behind `show_in_directory`, which defaults to
false, and a minimum count of 5. Both go.

## 5. The Find form — `app/find/form.tsx`
- **Mode is asked FIRST**, before location, as a hard filter: In person / Separately / Either
- Location is asked **only** when the answer can be *In person*. Zero shared location tags is a
  hard block for together and irrelevant for separate
- 68 locations, dropdown only, no free text
- The line *"Everything else, like distance, time and place..."* is **removed**. It explained
  something the screen never claimed

## 6. The match — three states, one screen
The app has a matched state; it does not have these three. One person can answer before the other,
so all three are real:

    offered              their card, the reasons you matched, Accept / Not quite right
    you-accepted         waiting on them. You can still back out
    expired              neither answered in 24h, both back in the pool

**One clock, 24 hours, started when the MATCH IS CREATED** — not when either side answers. Both
people see the same number counting down.

## 7. Matched — the resting state
This is what someone opens Find to see for weeks, so it carries weight rather than being a row:

- Both profile pictures, with a **green tick between them**
- *You and <name>*, what you are paired **on**, and how long
- **End this match**
- A `···` menu with **Report** and **Block**

## 8. End match, report, block
- **End match is neutral and lives HERE.** Not on Challenges. Six reasons, and the reason is
  **private** — the other person is told only that the match ended
- *Something felt off* **is accepted**, not refused. It ends the match and then offers the report
  flow. Refusing it would mean someone who felt unsafe cannot leave until they file a report
- Report categories are **scoped**: `Fake profile` / `Something else` until the pair has actually
  met, all five after. `features/safety/rules.ts` already exports `reportCategoriesFor(met)` —
  use it, do not re-derive it
- All three paths end on the same neutral line. `app/modals/match-ended.tsx` already does this

**Needs backend:** there is no neutral `end_match` today, only `block_partner` and
`report_partner`. Build the screen; wire the RPC when it lands.

---

# D. The first plan and the streak target

## 9. Plan a session — `app/plan/[challengeId].tsx`
**Prototype:** `T1 Plan` on both prototypes.

A **proposal**, not a fact. Nothing is planned until both say yes.

- Mode, day, time, and place (place only when together) ride in **one** proposal. The other person
  accepts or suggests another
- Mode is asked on **every** plan, so a rainy week can be done separately without touching the match
- **The FIRST plan also sets how much and how often**, and this is where the 1 October change lands:

      cadence   SHARED. 1x to 6x, then Daily. It defines the week, the repair
                debt and how long a streak takes
      amount    PER PERSON. You set yours; they set theirs on accept

  The card then reads *You 5 km · Gayan 3 km*, and collapses to *5 km each time* when they match.
  A circle still fills only when **both** finish **their** number
- Reason, so nobody re-litigates it: losing a match over 5 km versus 3 km is a waste of a match.
  What the product is about is showing up for each other
- The unit never differs — it is set by the activity

**Needs backend:** `days_per_week in (3,4,5,7)` rejects 1 and 2 today. The picker offers 1×.

## 10. How long a streak? — new screen
**Prototype:** `Pick your streak` on the Challenges prototype.

Asked **once, right after the first plan is accepted.** Not before.

- It cannot go earlier: before a cadence exists the number means nothing, and the plan itself is a
  negotiation while the streak is **personal** — your partner gets no say in your number
- Presets only: **10 / 20 / 30 sessions**. No custom entry for MVP
- Each shows an estimate computed live from target ÷ cadence — *About 5 weeks at 4× a week*.
  **Never stored.** Misses and repairs move it, which is exactly why it is not a fact

**Needs backend:** `target_sessions` on `user_challenges`.

---

# E. The Challenges tab — `app/(tabs)/challenges.tsx`

**This is a rebuild, not a refactor.** The file is 581 lines of the old model: `challenge_tasks`,
`task_checkins`, *"Day 5 done. See you tomorrow."* None of it survives.

**Hard-blocked on Gayan.** Do not start until `partnerships` and the `pair_plans` columns exist.

## 11. The commitment card
- Before a match: the activity only, and the card is **tappable** (task 2)
- Partner row by state, each with a **standard button**, never a text link:

      none        [Find a match]
      searching   Partner: searching...      [See your search]
      invited     Partner: invited...        [See your invite]
      pending     A match is waiting...      [See your match]
      partnered   You + <name>

- **No "Partner: not found yet" row.** The button already says it
- **The weekly counter appears only while partnered.** "0 / 3 this week" with nobody to do it with
  is a number that cannot move
- **When a match ends, their amount goes with them.** Yours and the cadence are the commitment and
  it continues. This was a live bug on 1 October: the card showed *"Let's make it happen · You 3 km
  · Gayan 2 km · [Find a match]"* — three things contradicting each other in four lines

## 12. The streak
The only standing number on the tab.

- `target_sessions` circles, in the brand orange. **Always exactly that many** — a miss does not
  add one and a repair does not append
- Circle states: **solid orange** done · **marked outline** missed, not repaired · **plain** ahead,
  unplanned
- A circle is a **session**, labelled with its day
- **A circle fills only when BOTH people finish.** Showing up alone earns nothing
- **Personal in ownership, shared in earning.** It is your 12; it survives your partner leaving and
  they keep their own count
- **COMPLETE WHEN ALL N RESOLVE, NOT WHEN N FILL.** Resolved means filled or missed-and-unrepaired.
  Finishing at **11 of 12** is a real outcome, and the extend prompt still appears. Getting this
  wrong strands a streak at 11 forever with no way out — it was live in the prototype until 1 October
- Under it, the shared heart: sessions **with this partner**. A different number from the streak,
  measuring a different thing

## 13. What is NOT on this tab
Cut deliberately, so do not add them back:

- **THIS WEEK card** — a circle carries its own day, so it showed the same thing twice
- The weekly progress counter, the scaled-week-1 arithmetic
- Partner search, invites, match banners, Pulse, Community
- **Nothing resets, ever.** A miss costs the circle and one session owed against the week

## 14. History
Finished challenges, not tappable. Ending a challenge saves the streak to history —
*Ended · 7 of 12 · September 2026* — and **does not end the match.**

---

# F. The day of

## 15. Session details — `app/challenge/[id].tsx`
The only details screen. Day, time, place, mode, both statuses.

- **The why is PRIVATE.** The card showing your partner's why is removed. Nobody reads anyone
  else's answers; they come back only to the person who wrote them, from Profile
- Nudge and *Running late?* live here only, and only on the day
- Move and Cancel both need the other person to agree
- A small **Report a problem** link, meetups only, opening the same sheet as Find
- `···` menu: End this challenge

## 16. The day-of flow
**Together:** on my way → I'm here → (both here) → Confirm with QR → **Complete session**

**Separately:** Done / Doing it later / Can't today

- The button after the QR scan says **Complete session**, not *Finish*. The scan confirms you are
  together; completing is a separate act
- *Doing it later* counts if finished before midnight local
- QR is **live camera only**, one code per session

## 17. Misses and repair
- **Missed** = no check-in by `due_at`. Not "by midnight" — see the timezone answer below
- A one-sided miss is **recorded**: a reason from a short list plus an optional line. The partner
  sees a neutral message, never a blaming one
- **Nothing resets.** The circle is marked and you owe one session against the week
- **If your partner missed, you BOTH owe one.** A session needs both people, so it did not happen
  for either of you
- Repair is choosing **when** to pay it: *this week* or *next week*, after which the ordinary plan
  flow runs
- **One repair per week, maximum.** A second miss is simply lost
- An unpaid *this week* repair **rolls into next week** automatically, so the choice is a
  preference rather than a trap
- **Repair fills the MISSED circle**, it does not add a thirteenth

## 18. Move, cancel, end
- Move and cancel are **neutral to the streak**
- Cancel **warns first**: it cannot be undone, and if they do not answer by end of day the plan
  stands
- Ending a challenge **warns**, ends the streak at its current score, saves it to history, and
  **keeps the partner**

---

# G. Home — `app/(tabs)/home.tsx`

**Do this last, and do not build it from the Home states prototype.** That prototype is stale —
still on "commitments kept" and the old radar copy. Build from the Home screens inside Splash to
Home, and rebuild the Home states prototype afterwards if it is still wanted.

- Home **delegates**. It starts nothing and ends nothing; it hands off to Find or Challenges
- The hero shows the current commitment and the single next action
- The heart grows at 1, 5, 10, 25, 50 — that is the **pair** count, not the streak

---

# H. Cross-cutting — do these as you touch each screen, not as a pass

## 19. Vocabulary
The word *commitment* collided with itself, so it was split. This is search-and-verify, not
search-and-replace — check each hit:

    commitment   the WEEKLY agreement. "Run 2x a week". Unchanged
    session      one occurrence of it. What a circle is
    streak       your personal count of sessions toward a chosen target
    the heart    sessions with this partner

    "14 commitments kept"           ->  "14 sessions"
    "Commitment 1 of 2 this week"   ->  "Session 1 of 2 this week"
    "14 commitments kept together"  ->  "14 sessions together"   (Community feed)

## 20. Units
- Workouts are **minutes**. Any code deriving a unit from the chosen exercise is dead — there are
  up to four of them now
- `features/challenges/matching.ts` has a comment still naming `profiles.accountability_mode`.
  Harmless, but fix it when you are in there

## 21. The things that must not drift
- **No long dashes in user-facing copy.** 89 lines under `app/`, `components/` and `features/`
  have one inside a string literal. Not all are user-facing — some are developer strings and
  notes — so check each hit rather than replacing blind
- Buttons say what you get, not what you do: *See your match*, not *Go to Find*
- Every handoff is a standard full-width button. A text link beside a full-width primary reads as
  an afterthought

---

# What NOT to build

- **A combined prototype.** The activity is a variable, not three flows. Yoga and Workouts render
  the same screens with a different noun
- **Group anything.** One active partnership per person, decided 1 October. A circle needs to know
  which both
- **Solo mode.** Removed from the product. Every path that offers going solo goes
- **Pause.** Not a feature. No partner means no sessions get planned, which means no slots pass,
  which means nothing is missed. Pausing is what happens, not what you build
- **An end date on a streak.** Shown as an estimate, computed on screen, never stored
- **A slot table.** A circle can only be missed if the session was planned, and sessions are
  planned one at a time

---

# Order, and why this order

Nothing below is built twice if you go in this sequence.

| | Work | Blocked on |
|---|---|---|
| 1 | **A — the intro** | nothing |
| 2 | **B — create and edit the commitment** | nothing |
| 3 | **C — Find: landing, directory, form** | nothing (directory needs the RLS change to show real people) |
| 4 | **C — Find: match states, end match, report/block** | screens now, RPC later |
| 5 | **D — first plan and streak target** | `days_per_week`, `target_sessions` |
| 6 | **E — Challenges tab** | `partnerships`, `pair_plans` columns |
| 7 | **F — the day of, misses, repair** | `'missed'`, `is_repair`, `repairs_plan_id`, `due_at` |
| 8 | **G — Home** | everything above, because Home only reflects it |
| 9 | **H — the sweeps** | done as you go, verified at the end |

**Why 1–4 first:** they touch nothing Gayan owns, so his timeline cannot stall yours. **Why Home
last:** it shows the state the other screens produce, so building it early means building it twice.

---

# Still not built, and deliberately

**A COMPONENT test harness.** Be precise about what is missing, because a unit-test setup does
exist and it is easy to assume it covers more than it does.

    exists       jest, ts-jest, `npm test`, and TEN test files:
                 auth/schema, challenges/matching, challenges/why-rotation,
                 directory/format, onboarding/mappings, plans/chat-filter,
                 plans/copy, plans/negotiation, plans/steps, safety/rules
    missing      jest-expo. @testing-library/react-native. Any test that
                 renders a component at all

Every one of those ten tests a **pure function**. Not one renders a screen. So the copy rules, the
matching weights and the negotiation logic are covered, and **every screen in this document is
untested by anything except someone tapping it.**

Deferred by explicit decision, after Challenges, and it should be the first thing after this list
rather than the last. The rebuild in Section E is exactly the kind of change that a harness would
have made safe, and it is going in without one.
