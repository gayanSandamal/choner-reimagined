# Decisions Log

Running record of conclusions reached in working sessions with Claude Code. Not a polished spec — see `docs/` for those. Gitignored: local-only, not part of the committed history.

---

## 2026-09-18 — Track A (daily loop) takes priority over Track B (matching/onboarding polish)

**Context:** The recent build cycle (capability/beginner/commitment model, nine activities, location tag system, Find tab redesign — see `Choner_Claude_Code_Master_Briefing.md`) improved matching and onboarding, but none of it touches what happens *after* two people are paired. Asel (LAN) had earlier flagged, as a condition for getting to "100 real users, not friends, not family," that the app currently ends right where the product should begin: no photo check-in, no way to see a partner showed up, no shared visual proof of streak.

**Two tracks identified:**
- **Track A — the daily loop.** Photo check-in, partner-showed-up visibility, shared streak proof. Flagged as urgent months ago (Asel's "100 real users" ask). Neither track depends on the other being done first.
- **Track B — matching/onboarding polish.** Just completed. Makes matching smarter and onboarding better, but doesn't touch post-pairing behavior.

**Tension:** Sophisticated matching is close to wasted effort with no working daily loop — you could pair someone successfully and the product still ends there. Conversely, the old crude matching logic isn't good enough to launch to strangers either. Both are real and well-specified; the master briefing deliberately didn't rank them.

**Conclusion:** Track A (daily loop) is the more urgent of the two, given Asel's specific ask was real users who will not stick around without something to do together daily. Track B's matching work remains necessary before a stranger-facing launch, but is not the next thing to build.

**Decided by:** user + Gayan (confirmed explicitly in conversation, not left ambiguous in the briefing doc).

---

## 2026-09-18 — Partner communication: scoping the daily-loop problem

**Context:** Track A's daily loop needs matched partners to coordinate specifics of their activity/goal (time, location, whether today's session is happening) — but the ask is explicitly **not** a general chat service.

**Options considered:** see conversation for full write-up (structured shared "today's plan" object, canned quick-replies for logistics, scoped/rate-limited free text, async voice notes, or a layered combination). Recommendation given: solve the coordination need structurally first (shared plan object + canned quick-replies), defer open-ended free text given stranger-pairing moderation/safety cost. No final decision recorded yet — pending user/Gayan sign-off.

---

## 2026-09-19 — Artifact vs app audit: what was fixed, what was deferred

**Fixed (uncommitted, for local testing):** bottom nav resized to the artifact (pill ~66pt, 22px icons, 10px labels, no active dot, inactive icons white / labels 40%); both bars now float (tab bar is an absolute overlay 16pt off the bottom, screens use top-edge safe area only and pad for the pill; top bar margin 14 to 6 with its shadow drawn over content); splash is now the wordmark "choner." only; welcome is now logo image (`assets/choner-logo.png`, extracted from the artifact) + two-line tagline, existing Sign in / Sign up / invite-code buttons kept.

**Deferred:** Home prompt (starting point). Root cause found: onboarding step 8 writes `commitment_value`, and `get_starting_point_status` treats a non-null commitment as "already answered", so the prompt never fires after onboarding. Needs a migration with its own "answered" marker. Not done, do not run `npm run reset:challenges` to work around it (wipes everyone's check-ins on the shared DB).

**Decided / no change:** button glow stays. `theme.shadow.glow` already equals the artifact's button shadow (0 10px 26px rgba(253,91,1,.32)). Confirm-password on sign-up and back buttons on sign-in/sign-up already exist in the app; the artifact's sign-up lacks confirm-password, so the app is right.

**Known follow-ups:** native OS splash (`app.json` splash image) still shows the old heart mark and needs a rebuild + new asset to match; the traced `chonerMarkXml` logo has dark speckle fringes on light backgrounds (still used by the onboarding animated logo).

---

## 2026-09-19 — Sign-in / sign-up rebuilt to the artifact

Earlier note that "confirm password and back buttons already exist" was true for the fields but missed the point: the user wanted the screens to match the artifact. Rebuilt both: floating navy top bar with back arrow + title ("Log in" / "Create account"), light headline with bold tail, labelled 16pt-radius inputs with eye toggle, gradient button with glow, and a text link to the other screen (replaces the outline button). Confirm password kept (artifact lacks it, app is right). Switching between the two screens uses `replace` so the back button doesn't loop. Forgot-password, reset-password and verify-email still use the old layout.

---

## 2026-09-21 — Find flow (Running) prototype

Built an interactive artifact from `Choner_Find_Tab_Full_Flow_Running.md`: https://claude.ai/artifact/YLKUahXoetAvC6JK2Kzw7M. 25 screens across phases P1 to P10 with a shared negotiation component and a "View as" toggle for Dinesh / Gayan.

**Open questions raised by the spec (not resolved):** (1) Phase 2 says "only three fields" but lists two, gender preference and area. (2) The "Finish" tap is a proposed resolution, not confirmed. (3) No fallback defined when someone declines the phone-number exchange. (4) Effort conflicts (Easy vs Steady): the prototype omits "meet in the middle" because the levels are adjacent, which is my call.

**Copy changes vs the spec:** emoji replaced with line icons and em dashes removed, per the design system rules.

---

## 2026-09-21 — Find flow prototype: effort step removed, photos added

Removed "What kind of run sounds good?" (Phase 7) and its conflict screen from the Running find flow. After distance or duration is agreed the flow goes straight to Together / Together, Apart. Effort no longer appears in the confirmation, day-of or finish screens. Phases renumbered: mode is P7, Together is 8A, Together Apart is 8B, completion is P9 (the source spec still uses the old numbers and still contains Phase 7). Both partners' profile photos now appear on Match found, Choner steps in, Finish, and both completion states (partner's photo dimmed until they check in). Photos are illustrated placeholders until real images are supplied.

---

## 2026-09-22 — Find flow prototype: 20-point review round

Applied Dinesh's 20 review points to the Find flow artifact (same URL, version 4). Decisions baked in:
- Mode names: "Run together" and "Run separately, together" (replaces "Together, Apart"). Description: "Go for your run without meeting up, but stay accountable to each other."
- Meeting place is a typed free-text suggestion. One person suggests, the other says "Sounds good" or suggests another; after two proposals "Need help choosing a place?" hands off to Choner/founders. Recorded (tracked): location_suggested_by, location_final, number_of_location_proposals, location_agreed_without_founder_help, founder_help_required. Stored at minimum: meeting_location_name, meeting_location_text, meeting_location_status. The artifact shows these live in the notes panel on the Where screen.
- Time is a day selector plus a time input everywhere (together, separately-together, and rescheduling).
- Back button steps out of a sub-state first (a suggestion being typed or sent, a photo prompt), then returns to the previous screen.
- "Doing it later" tells the partner it will be done later today, then a button marks it complete and notifies them.
- "Can't today" opens a day/time picker with the line "Your partner is counting on you."
- Say Hi has a single opener: "Hey, ready to do this?" (replies unchanged).
- Names and photos follow whoever is looking (View as).

---

## 2026-09-22 — Find/Challenges split, Report & Block, and remaining discussion items built into the artifact

Same artifact URL (version 5): https://claude.ai/artifact/YLKUahXoetAvC6JK2Kzw7M. Major reorganization plus the confirmed items from the prior discussion round.

**Find/Challenges tab split (option a from the walkthrough):** Landing through Match Found stays in Find (P1-P3). A new screen, "Plan your first run" (C1), sits between Find's hand-off and Say Hi — it's a genuinely new sub-state Challenges doesn't have yet ("partnered, first session not agreed"), gating the TODAY card the way `challenges.tsx` currently doesn't. Say Hi through completion (C2-C7, phases 6A/6B) now render under the Challenges bottom-nav tab. Find gets a new post-pairing purpose: a "You're all set" hand-off (mirrors the real `find.tsx` PairedState) plus a link to a new view-only "Also running" screen.

**"Also doing this" feed:** scoped to anyone with Running as their current active challenge, app-wide, no location filter (confirmed over pool-only or geo-scoped). Profile picture (initials avatar) + first name + what they've committed to. No tap-through, no message, no match action. Flagged as needing a real empty/sparse-state design before shipping, given likely low per-activity counts at ~100 users.

**Report & Block:** built into the artifact per `Choner_Report_Block_Spec.md`. Option A category list (flat, no visual distinction) confirmed. Report reachable from Match Found via an inline link; Block+Report reachable via a "···" menu from Say Hi onward. Both route to a single "ended" screen whose copy is proven symmetric via the View-as toggle — the neutral "This match has ended" line never changes regardless of viewer, only the actor's own confirmation line differs (and only for the actor).

**Phone exchange removed:** the whole "Want to exchange phone numbers?" screen is gone, superseded by the temporary in-app chat decision. Confirm screen now shows "A quick chat opens once you're both at the meeting place." plus the standing safety line "For your safety, keep the conversation in the app and hold off on sharing personal details." (also shown on Say Hi). The temporary chat itself is explicitly NOT modelled in this artifact — it's a real app feature to spec and build separately.

**Google Places (illustrative):** the Where field now shows a live-filtered suggestion dropdown from a small canned Colombo place list as the type-ahead stands in for the real Google Places Autocomplete call. Confirmed direction: restrict via `locationRestriction` to a Colombo bounding box, proxied through a new Supabase edge function so the API key never ships client-side.

**Photo privacy copy (confirmed, changed):** "Only visible to each other as a view-once photo after you've both shared. Saved to your profile."

**Share to inspire:** done-b (You both showed up) now has a Share to inspire / Not now choice, previewing what posts to Community using MilestoneRow's exact pattern (overlapping avatars, plain-language line, badge). Confirmed trigger: every time both partners complete a session together, not just streak/full-completion milestones — this needs a new trigger added to the real `SharePrompt` component, in addition to its existing ones.

**Reschedule reuse confirmed:** the "Won't be able to make it today" path (from the day-of three-option notification) reuses the existing "Can't today" reschedule UI rather than a second build, and the temporary chat stays open until both sides confirm the new time, not the instant one taps reschedule. Noted in the Day of screen's notes, not modelled step-by-step since it depends on the chat feature.

---

## 2026-09-22 — Match Found bug fix (dual-sided accept) + report scoping

Same artifact URL (version 6): https://claude.ai/artifact/YLKUahXoetAvC6JK2Kzw7M.

**Bug fixed:** Match Found previously tracked one shared "accepted" flag, so there was no way for Gayan to accept independently — a real gap, not just a display issue. Acceptance is now tracked per person; switching View as shows each side's own accept/decline screen. Added the missing "Find someone else" (declines this match, stays in the pool) and "Stop looking" (leaves the pool) actions to the waiting-for-partner state, matching the real find.tsx. Added a line describing the push notification that would summon the other person to their own accept screen in the real app (not modelled as a literal notification, since the artifact has no push).

**Report category restriction, confirmed:** Fake profile / Something else only until the pair has actually met (QR scan for Run together, or a first check-in for Run separately, together) — then all six categories. No one-liners anywhere, per instruction to keep it simple. Category set is computed globally (one `metUp()` check) so it applies consistently everywhere Report opens, not just Match Found.

**Find tab is now truly persistent:** "Matched" (renamed from the old one-time "You're all set" hand-off) is reachable right after both accept, shows the partner's photo, and carries the Report/Block menu. It's grouped under Find itself now (P4/P5) rather than a separate "after pairing" group, and sits right after Match Found in the phase order — reflecting that this is what Find always shows once paired, not a one-off screen.

**Copy:** "Something not right? Report" -> "Report". Decline copy confirmed: "No problem, we'll keep looking for someone else who fits." — shown once on arrival at Searching after declining, not built as a separate confirmation screen (noted for the real app, not modelled as its own artifact screen per instruction).

---

## 2026-09-23 — 16-point copy/UX round, two real bugs fixed, locked for the actual build

Same artifact URL (version 7): https://claude.ai/artifact/YLKUahXoetAvC6JK2Kzw7M.

**Real bugs found and fixed (apply to the actual app build too, not just the prototype):**
- Chat bubbles in Say Hi were hardcoded to always show Dinesh's message on the right, regardless of viewer &mdash; correct for Dinesh, backwards for Gayan. Fixed: bubble side now follows whoever is looking; your own message is always on the right.
- The distance-selection screen ("How far would you like to run?") wrote to one shared variable regardless of viewer, so a value picked while looking as Dinesh could bleed into what Gayan's screen showed. Fixed: only the person actually answering can edit their own value; the partner's screen shows their already-recorded answer, read-only.
- "I'm on my way" / "I'm here" on the day-of screen was a single shared flag, not tracked per person &mdash; one person tapping it would incorrectly show as both having arrived. Now tracked independently per person.

**Behavior changes:**
- Searching: replaced "usually a day or two" with "we'll notify you the moment we find a match," and after a wait (5s in the demo, standing in for a longer real wait) the copy shifts to make clear closing the app is fine. Back button added (was missing).
- Match Found: acceptance is asymmetric and independent per person (already fixed last round); this round adds the heading change and drops the "Your match" eyebrow.
- Day of: requires both people to confirm they're at the meeting place before anything happens. Only then does the temporary chat open, followed by a separate, explicit "Open QR verification" button &mdash; QR no longer auto-opens the instant one person taps "I'm here."
- Confirm screen: removed the "Jump to the day" shortcut. Nothing fast-forwards a real user to the day of.
- Distance only for Running/Jogging, Walking and Cycling &mdash; no duration option for these activities.
- "Also doing this" broadened from same-activity-only to everyone active on Choner, any activity, per your explicit reversal of the earlier same-activity-only decision. Button renamed to "See Who Else Is Here."

**Copy locked in:** "You found a Match." (Match Found), "You found your Match." (Say Hi), "Someone else is looking for you too." (Find landing, no onboarding data fabricated), "Report" (was "Something not right? Report"). Removed one-liners: "Partners on Running. Track it from Challenges." (redundant with the Go to Challenges button), "Find handed you off the moment you both accepted..." (Plan your first run), "View only. There's no way to message or match with anyone here." (Also doing this).

## 2026-09-24 — Onboarding partner path resolved; custom habits removed

Context: the onboarding "How do you want to do this?" screen let "Find the right partner" bypass the Find tab (no gender preference or area, different searching experience). Reference: Choner_Onboarding_Partner_Path_Resolution.md.

Decisions (Dinesh):
- The choice screen itself is unchanged. What changes is what happens after a card is tapped.
- Invite completes inside onboarding: share a link (WhatsApp, Messages, Copy link) with an editable default message built from the challenge, e.g. "Dinesh is challenging you to run 3 kms, 3x a week. Are you up for it?", then "Invite sent", then Home (Invited state). Email stays as an optional second way (assumed, not explicitly confirmed).
- Find becomes a two-screen detour: (1) "Have you done this before?" (capability, or beginner start), (2) gender preference + area. Then straight into the shared radar in its searching state, then Home (Finding state). One shared radar component for onboarding and the Find tab.
- The onboarding Starting point screen (how much, how often) IS the commitment answer. The Find detour asks capability only. This makes the earlier "Home prompt suppressed by setChallengeTarget" behaviour expected rather than a bug.
- Backing out of the detour saves the answers; Home and the Find tab show "Finish setting up your search" and resume.
- Custom habit creation ("+ Create your own") is removed from the flow, along with the custom-habit branches (skip target, hide Find).
- Three searches a day still applies to both entry points.
Open: ending destination after the radar (Home assumed), matching-time copy ("usually a day or two" vs notify-on-match), final invite message wording.

## 2026-09-25 — Home tab restructured (Choner_Home_Tab_Product_Structure_MVP.md)

Implemented in the app-flow prototype (https://claude.ai/artifact/4Sk5AwVK4f4BouSWks8gon). Home is a state, not a dashboard. Order: greeting, Your Choner (hero), Shared Relationship, Choner Pulse, Recent Choner Activity, Coming Up.

Hero states: A no partner (Find my partner), B partner found (Plan your first run), C planned (View commitment), D together on the day (I'm on my way, I'm here, QR, Finish), E separately on the day (Start my run, then You both showed up), F nothing due (You're all set + next commitment), plus post-completion (You both showed up + kept count + next commitment).
Streak = one shared commitment completed by BOTH people, shown as "N commitments kept". Never "N day streak".
"See who else is here" stays on the Find tab only. Challenges owns "what have I committed to" (active, upcoming, past).
Removed from Home: daily log-a-task list, check-ins timeline, "Running late today?" note, photo-proof camera (day-of flow in Challenges). Solo users cannot log (consistent with "no Solo mode").
Onboarding cadence options changed to 1x, 2x, 3x a week, Daily (doc example is "Run 2x this week").

Assumptions / open (flagged in the prototype notes):
- Pulse + Recent Activity numbers must be real aggregates, never invented; need a minimum threshold and an early-days fallback. Pulse categories do not cover habit challenges (water, breathing, journaling).
- Doc is silent on the "Your reason" line and the community share prompt: kept as one slim line / shown only after a completion at 7+ kept. Confirm or remove.
- How the second weekly session is scheduled (assumed: picked in the plan step, same time).
- Whether a missed commitment resets the "in a row" count.
- Emoji in the doc replaced by line icons per the design system; no wave in the greeting.
- Pulse heading: five options; "Choner is moving" used. Option 2 clashes with the Recent Activity heading.
- Final visual for the evolving shared relationship left for later (placeholder heart).

## 2026-09-25 (later) — Photo screen, solo removed, copy and location fixes

Applied to the app-flow prototype and, where relevant, the Find and Challenges prototype.
- New onboarding screen AFTER the Reveal: live camera photo (camera only, no gallery), with "Set up later". Status stored as photo_confirmed / no_photo. Shown as "Photo confirmed" / "No photo yet", never "verified". Profile offers "Add your photo" if skipped. Source: Choner_31_Changes_Full_Detail.md #1 #2, Branch Plan Branch 3.
- Solo mode removed: no "Continue solo, for now". Everyone chooses Invite or Find. (The "I'll explore on my own" skip on the onboarding intro is a different thing and was left; confirm.)
- Partner-choice subtitle now "Choner works better when someone is counting on you."
- Invite option sub text: "A friend or sibling, anyone on the same path." (same wording on the invite screen)
- Removed "You can invite someone any time from Home."
- The long dash character is removed everywhere in copy (replaced with commas, colons or full stops).
- Find locations: max 2, closable chips, keyboard closes after a pick, suggestions only appear once typing starts. "Typical Pace" removed from every activity (it does not exist in either prototype, so only the app needs the removal).
- Challenge screen: title "Pick what you'll start with"; the "Seven days, one habit..." line removed; custom challenge creation removed everywhere.
- Secondary CTAs on Home/invite (Resend, See your journey, Change the plan) moved to the orange gradient button; SIGN UP and BACK TO SIGN IN stay outlined as in the app.

## 2026-09-25 (later) — Home states artifact + Choner Pulse and Just Happened

Built a standalone interactive Home prototype covering every state (Choner_Home_Choner_Pulse_Live_Moments_MVP.md + the earlier Home structure doc).
- Home flow: header, Your First / Next Commitment, Shared Heart / Relationship, Choner Pulse, Just Happened, Coming Up.
- Choner Pulse is ONE card (replaces "Choner is moving" + "People are showing up"): big count, four tappable activity tiles (open Find filtered to that activity), optional daily summary chips (+8 commitments, +2 new pairs, +5 completed). No profiles in the Pulse.
- Just Happened: short rotating visual moments (pair graphic, counts), not a feed.
- Heart stays: "You + ?" before a partner, "You + Gayan" after; the heart grows at 1, 5, 10, 25, 50 commitments kept.
- Home "Why" line and SharePrompt are not in the doc's Home flow and are not in this prototype. Confirm whether they return elsewhere.
Open: Pulse/Just Happened numbers must be real aggregates with a minimum threshold (a Quiet variant is drawn); "Moved", "Missed", "Challenge complete" and "Match ended" states are derived, not in the doc; what happens to the partner when a challenge completes.

## 2026-09-25 (later) — Home vs other tabs: ownership decisions

One owner per function; Home shows status and the next action, and opens the owner's screen.
- Day-of (I'm on my way, I'm here, QR, Start my run, Finish): Challenges owns. Home is a shortcut. One-tap actions (I'm on my way, I'm here, Finish, Accept a moved plan) work inline on Home and call the same action as Challenges. QR and "Start my run" open the Challenges screens.
- Planning and recovery (Plan, Move it): Challenges owns; Home buttons open the Challenges screen.
- Searching: Home shows only a small pulsing "Searching" indicator that opens Find. Find owns the radar and Stop looking. No second radar on Home.
- "Find my partner" on Home opens the Find tab and starts the search. Invite stays a small share sheet on Home.
- Coming Up is removed from Home (Challenges owns upcoming commitments).
- "Choose a challenge" opens the Challenges browse screen.
- "See your journey" stays a Home-only screen (decided against merging with Challenges history; watch for drift with Challenges' past-commitments list).
- Just Happened stays anonymous system counts. Community stays user-shared and named. Home never shows Community posts.
Build note: one shared component and route per function; the other tab renders an entry point.

## 2026-09-25 (later) — Home layout tweaks
- "Choner Pulse" heading in title case (not all caps); "Just Happened" set the same way for consistency.
- Home order is now: greeting, the shared heart (on top), Your First / Next Commitment, Choner Pulse, Just Happened. This differs from the earlier doc order (commitment before heart).
- Just Happened is a square, dark navy card, live (changes by itself), and not tappable.
- Top bar and bottom nav both float: content scrolls beneath them, no white layer behind. (Home prototype only so far; the app-flow and Find prototypes still use the old fixed bars.)

## 2026-09-25 (later) — Tab order and badges
- Tab order is now Home, Find, Challenges, Community (was Home, Challenges, Find, Community). Reason: acquisition first, the product loop (find someone, then commit, then show up). Trade-off noted: a returning paired user's two most-used tabs are no longer adjacent.
- Badges (small orange dot on the tab icon): Find when a search has a match to accept; Challenges when a step needs the user today (plan the first run, planned run on the day, "your turn", a moved plan, a missed session); Home never.
- Added a "Match to accept" state in the Home prototype (Find owns accepting; Home points to it).
- Applied the new tab order to all three prototypes. Badges exist in the Home prototype only.

## 2026-09-26 — Challenges tab spec (Choner_Challenges_Tab_Product_UX_Specification_MVP.md): first decisions

Cross-reference of the spec against the app found the spec uses a different product unit from the code (7-day challenge + daily task check-in). Decisions (Dinesh):
- Unit of progress: a shared commitment (a session, e.g. "Run 2x this week"), as in the spec.
- Streak: number of commitments BOTH partners completed, as in the spec. Not days.
- Sessions: several per week. When one session is completed, the next session's plan comes up immediately, with the streak visual.
- Cadence: 1x, 2x or 3x a week.
- Solo mode: removed everywhere (code still has partner_state 'solo', the solo panel, "Half a heart is still a start", "Solo" page label).
- History: a list of finished challenges, not tappable (keeps today's behaviour, overrides the spec's tappable history).
- One-sided miss: needed. A simple screen, and the miss is recorded (today only a check-in choice exists, no record).
- Journey timeline: not needed at this stage.
- Remove all overlaps with other tabs and all duplicates (solo panel invite/find, finding "invite instead", invited resend links, MatchBanner, SharePrompt on both Home and Challenges, daily Mark as done on both Home and Challenges, etc.).
Next: go section by section (spec needs, overlaps, bugs, spec gaps, order) and decide how to build each.

### Section 1 decisions (what the spec needs that doesn't exist) — 2026-09-26
- Duration: rolling weekly, no end date. Continues with the same partner until someone ends it.
- Weeks: calendar weeks, Monday to Sunday. Week 1 starts on the day both accept and runs to that Sunday; after that, full Mon to Sun weeks.
- Short week 1: the target scales to the days left (e.g. 2x a week, matched on Friday = 1 session in week 1; never an impossible week).
- Planning: one session at a time. As soon as a session is completed, the next session's plan comes up immediately, with the streak visual.
- Miss: a session is missed if a person hasn't checked in by midnight of the planned day, in their own local time. "Doing it later" counts if done before midnight. If either misses, the shared streak ends (subject to repair).
- One-sided miss screen: the person who missed sees "What happened?" with the existing reasons (too tired, no time, weather, work, not feeling well, something else) + an optional line; recorded. Then "Plan the next one". The partner sees e.g. "Dinesh missed this one. Your streak ended at 6. Ready for the next one?"
- Streak repair: after a miss, both see "Repair your streak with Gayan". They plan one extra session within 3 days; if BOTH complete it, the streak continues (the miss stays recorded). Otherwise it ends. One repair per week.
- Move: needs both to agree. If the other doesn't answer before the original day ends, the original plan stands (miss rules apply). Cancel: needs both; recorded as cancelled; no streak change either way.
- Streak numbers: current streak only ("6 commitments kept"; "Your streak ended at 6. Ready for the next one?"). No best/total yet.
- Detail screens: one Session Details screen only (day, time, place, mode, You/Gayan status, one action: view plan / open today's session / move / cancel). No commitment-level screen. History rows stay non-tappable.
- Ending: "End this challenge" in the challenge's menu; either person can end. Goes to History as "Ended"; neutral copy "This challenge has ended." Changing activity or cadence = end, then start a new one.
- MVP activity list (every activity gets weekly sessions, together or separately):
  Running, Jogging, Yoga, Walking, Cycling, Workouts.
  Workouts are not home-only: they can be done together at a meetup or separately anywhere. Exercises:
  Push-ups (standard, reps e.g. 20), Squats (bodyweight, reps e.g. 30), Lunges (walking, reps per leg), Sit-ups (reps e.g. 30),
  Pull-ups (reps e.g. 10), Plank (standard, time e.g. 60 sec), Burpees (reps e.g. 15), Jumping jacks (reps or time),
  Stretching routine (general, time e.g. 10 min).
  Dropped for MVP: Gym/weight training, Badminton, Futsal, Indoor cricket, and all habit challenges (water, breathing, journaling, no caffeine, wind-down walk, bedtime stretch).
  Note: Pull-ups are back in (they had been cut earlier to avoid an equipment filter).

### Section 2 decisions (overlaps with other tabs) — 2026-09-26
Rule: one owner per function, no duplicates.
- Challenges tab shows NO partner discovery: remove the solo panel (Invite someone / Find a partner), the finding "Invite someone you know instead" link, and the invited "Resend invite / Invite someone else" links. Challenges only shows the partner status (Searching / Pending / You + Gayan).
- MatchBanner removed from Challenges: accepting a match is Find's job; Challenges shows "Waiting for Gayan to accept" as a status.
- Nudge and "Running late today?": both live on the Session Details screen only (and the day-of flow), tied to that session. Neither on Home nor on the Challenges tab surface.
- Report / Block: Find owns the full menu on the partner card. Session Details keeps a small "Report a problem" link (same sheet) so safety is reachable at a meetup.
- One active challenge per user for MVP. Remove "Find another partner" (Find) and the Browse challenges entry points on Home and Find. A new challenge is started only after the current one is ended, from one place: the Challenges tab ("Start a new challenge").
- Daily "Mark as done": removed from both Home and the Challenges tab; logging happens only inside the session (day-of) flow.
- Share prompt: only on the session completion screen (not on Home, not as a standing Challenges card).
- Heart + pair row: one shared component. Home shows it on top; the Challenges active-commitment card shows the "You + Gayan" relationship line.

### Section 3 decisions (bugs) — 2026-09-26
- Do not patch the old 7-day Challenges screen. Fold every bug into the rebuild and give Gayan these as acceptance checks:
  1. No solo mode or solo copy anywhere ("Half a heart is still a start", "Solo" label, solo panel). partner_state 'solo' is not a reachable UI state.
  2. The 'matched' state (partner found, not accepted) has its own "Waiting for Gayan to accept" state, never the solo fallback.
  3. No day-based copy ("Day N done", "N of N days. Not one missed.", "Miss a day and you both start over"); streak = commitments kept.
  4. No logging without a partner (no "going solo until then").
  5. Every activity (Running, Jogging, Yoga, Walking, Cycling, Workouts) can plan sessions; no running/walking/cycling-only gate.
  6. Plan / meetup actions never fail silently (no empty .catch); show a message.
  7. Pull-to-refresh reloads the plan/session and history as well as the challenge, streak and partner status.
  8. A failed partner-status load shows an error state, never a silent "your partner".
  9. Dates format with an explicit locale.
  10. No shaming copy; misses use neutral language ("Your streak ended at 6. Ready for the next one?").
  11. Every tappable element leads somewhere (the old non-tappable "Past challenges" toggle is replaced by the History list, which is non-tappable by decision and not styled as a button).
  12. "Start another challenge" never jumps straight to a marketplace; new challenges start only after ending the current one.

### Section 4 decisions (gaps and contradictions in the spec) — 2026-09-26
- Onboarding goals: keep all four as motivation; map each to the new activities and recommend by goal:
  Move more -> Running, Jogging, Cycling, Walking; Sleep better -> Walking, Yoga, Stretching routine; Reduce stress -> Yoga, Walking; Improve energy -> Workouts, Running.
  The challenge step shows only the 6 MVP activities. Drop all "7-day challenge" copy; describe by cadence (e.g. "Run 2x a week").
- No partner yet (Challenges card): status only ("Partner: not found yet", or "Searching..." only while a search is actually running) plus ONE quiet action "Go to Find" that switches tab. No search or invite inside Challenges.
- Match ends mid-challenge (report or block): the challenge continues, waiting for a new partner (same activity and cadence); the streak ends quietly because it belonged to that pair. Copy: "This match has ended. Your challenge continues."
- Home "See your journey" button: removed for MVP. Home keeps the growing heart (1/5/10/25/50) with its milestone dots. No journey screen until the Journey is built.
- Already covered by earlier decisions: second session per week (planned one at a time), miss cutoff (midnight local), unanswered move (original plan stands), daily cadence and habits (dropped).
- Design system still applies to anything built from the spec: line icons, no emoji, no long dashes, no red cross for a miss (neutral "Missed" treatment).

### Section 5 decision (build order) — 2026-09-26
- Prototype first, then a handover .md for Gayan and his Claude Code.
- Challenges tab prototype published: https://claude.ai/artifact/6ZrGVeuv7gRSoP2tmWkRav. Next: update the Home and app-flow prototypes to match (weekly commitments, 6 activities, no See your journey, no Browse entry points), then write the handover.

## 2026-09-26 — App-flow (splash to Home) prototype updated to the Challenges decisions
https://claude.ai/artifact/4Sk5AwVK4f4BouSWks8gon
- Challenge picker: the six MVP activities ordered by goal (Recommended badge on the first), Workouts asks which exercise; habit challenges and all "7-day challenge" copy removed.
- Starting point: 1x, 2x or 3x a week (Daily removed); amount per session.
- Invite message now reads e.g. "Dinesh is challenging you to run 3 km, 2x a week."
- Home: heart on top ("You + ?" / "You + Gayan", grows, no See your journey), then the commitment, Choner Pulse (one card, tiles open Find), Just Happened (square, dark, live). Coming Up, the reason line and the share prompt removed from Home. Searching shows a small indicator that opens Find.
- After both show up: kept count + "Plan the next one" (one session at a time).
- Browse challenges replaced by "Create my first commitment" (only when there is no active challenge). Journey screen removed.
- Challenges tab summary rebuilt (active commitment, this week, kept, history); full states link to the Challenges tab prototype.
- Floating top bar and bottom nav; Challenges badge when a step needs the user.
- Fixed a copy bug from the earlier dash removal (stray " , " in several sentences).
Not yet updated: the standalone Home prototype still has "See your journey" and the old challenge names.

## 2026-09-26 — Auth button colours fixed (app-flow prototype)
- Bug: SIGN IN (Welcome), RESEND EMAIL (Verify email), SEND RESET LINK (Forgot password) and SAVE PASSWORD (Reset password) rendered white with dark text, because the button shape class shared a name with the choice-chip class and lost the orange gradient.
- Fix: primary buttons use the orange gradient (#FD8302 to #FD5B01) with white text; secondary (SIGN UP, BACK TO SIGN IN) are white with an orange outline and orange text. Every .btn on every screen was checked and all carry the gradient. Home and Challenges prototypes do not have this clash.
- Note for the app build: keep chip styles and button styles on separate class names/components so a chip style can never override a button.

## 2026-09-26 — Email verification and invite code findings

### Bug: verification (and reset) links don't sign the user in
- signUp sets emailRedirectTo = choner://verify-email. Tapping the link verifies the account on Supabase, which then opens the app at /verify-email with the login tokens in the link.
- The app ignores the tokens (lib/supabase.ts detectSessionInUrl: false, and no code reads the link), so no session is created. The user lands back on "Check your email", not signed in, with "your inbox" in the text and Resend disabled (no email param). Only way on: Back to sign in and log in manually.
- The reset-password link has the same gap, so Save password fails without the session.
- Fix for Gayan: read the tokens from the incoming link and create the session; show a new "You're verified" screen (Continue -> onboarding, or Home, or the invite result if they came from a code); add a "This link has expired" screen (asks for the email, sends a fresh link, Back to sign in). Add choner://verify-email and choner://reset-password to Supabase's allowed redirect URLs.
- Both new screens added to the app-flow prototype (A3a "Email verified", A3b "Link expired").

### Invite code: where it exists today
- The "code" is the invite token: a 36-character hex string generated by the database (challenge_invites.token = encode(gen_random_bytes(18),'hex')).
- It only appears inside the invite EMAIL (invite-email function): "Install Choner, then tap I have an invite code on the welcome screen and enter: <token>".
- The inviter never sees it in the app. The share-link flow (WhatsApp/Messages/Copy) sends only choner://invite/<token>, no code, and a choner:// link is not tappable for someone without the app.
- Entering it: Welcome -> "I have an invite code" -> app/invite/code.tsx -> app/invite/[token].tsx.
- Problems: 36 characters is impractical to type; shared-link invitees never get a code; the custom-scheme link doesn't open anything if the app isn't installed.
- Open decision: short human code (e.g. 6 characters), shown on the "Invite sent" screen and included in the shared message, and an https link that falls back to the store.

## 2026-09-26 — Invites and search: one at a time; short invite code
Decision (Dinesh): an invite and a search never run together. Starting an invite stops the search; starting a search cancels the invite (its link and code stop working). Both ask first.
Built into all three prototypes (app-flow, Home, Challenges):
- Find tab holds every partner state on one screen: No partner (radar "Find a match" + "Invite someone you know" + small "Have an invite code?" link), Searching (radar + Stop looking + Invite instead), Invite waiting (code in large letters, Copy, Share again, Invite someone else, Find a match instead, Cancel invite), Paired.
- Short 6-character invite code (e.g. RUN4K7), created with the invite, sent inside the shared message with the link, used once, gone when the friend joins or the invite is cancelled. Link: https://choner.app/i/<code>.
- Home: invited state shows "See your invite" (opens Find). No code on Home. Challenges: status "Partner: invited, waiting to join" + Go to Find. No code on Challenges.
- Signed-in users enter a code from Find ("Have an invite code?"); signed-out users from Welcome.
Still open: (1) invitee who already has an active challenge enters a code (end theirs first / replace / block); (2) does an unused code expire (e.g. 7 days)?
Backend needed: today the code is the 36-character challenge_invites.token; add a short unique code column and look invites up by it; https link instead of choner://.

## 2026-09-26 — Welcome screen and auth styling
- Welcome: logo image and both tagline lines removed. It now shows only the wordmark "choner." (the logo and slogan live on the onboarding intro). Buttons: "Sign in" (filled orange) and "Sign up" (orange outline), both the standard app button size, 18px radius, sentence case. "I have an invite code" stays a ghost button.
- Verify email, Forgot password and Reset password restyled to match Sign in / Sign up: sentence case headings and labels, standard input fields, standard buttons. The old uppercase pill styling is gone from the whole prototype.
- Removed "Takes about a minute." from the Sign up screen and the onboarding intro.

## 2026-09-26 — Post-auth routing fixed (app-flow prototype)
Three routing bugs found and fixed; all entry paths re-traced.
1. Email verified -> Continue went to Home when the signed-in account was already onboarded. Verifying an email only ever happens right after sign-up, so Continue now always goes to the onboarding intro (or to the invite result when a code is pending).
2. Invite result -> Continue went straight to the "why" screen for everyone. A brand-new invitee then reached Home with NO profile (no goal, struggle, style, age, gender or energy), which matching and tone both depend on. Now: a new account goes to the onboarding intro and builds a profile, skipping only the challenge picker and the starting point (they inherit their partner's challenge) and finishing on the why; an existing account still goes straight to the why, prefilled and skippable.
   This is a real bug in the app: app/invite/[token].tsx replaces to /onboarding/why for everyone.
3. An invalid code entered while signed out became "success" after signing in, because the pending code was never re-checked. It now shows the error state.
4. Reset password no longer hardcodes Home; the index gate decides (onboarding if the profile is incomplete).
Paths verified: sign up -> verify -> intro; demo sign in -> Home; unverified sign in -> "confirm your email"; invite code signed out -> sign up -> verify -> invite result -> intro -> full onboarding (challenge + starting point skipped) -> why -> Home (partnered); invite code signed in and onboarded -> why -> Home; forgot -> reset -> Home; reset for a new account -> intro; expired link -> back to sign in; explore -> Home; invalid code -> error.

## 2026-09-26 — Onboarding skips and where the "why" lives
Finding: today Edit profile only has name, photo, goal and style. Struggle, age and gender were skippable AND had no way to be set afterwards, and matching depends on age + gender.

Decisions (Dinesh):
- "Skip for now" REMOVED from Goal, Struggle and About you (age + gender). Continue stays disabled until answered. Gender keeps "Prefer not to say" as the proper opt-out.
- KEPT: "Set up later" on the photo (optional by design, locked decision, Profile offers "Add your photo") and "Skip for now" on the why (four questions must never block someone eager; Profile can edit it).
- TO BUILD: add struggle, age and gender to Edit profile so nothing is permanently stuck (people move age bands, struggles change).
- The why answers had nowhere to appear after the reason line was removed from Home. They now surface on Session Details: one line, "Why Gayan is doing this: I've tried before and stopped.", attributed by name. Your own why stays editable from Profile.
Applied to the app-flow and Challenges prototypes.

## 2026-09-26 — Photo screen, Edit profile, icon-button bug

### Photo badge wording: NOT "verified"
Dinesh asked for the photo screen to say it earns a "photo verified badge". Written as "Photo confirmed" instead, because 2026-09-21 locked (Choner_31_Changes_Full_Detail.md #2): never label or imply identity verification. Choner only checks the photo was taken live, not who is in it; calling it "verified" is a safety claim we cannot stand behind when two strangers meet in person. Flagged to Dinesh for a final call.
New copy on the onboarding photo screen, under the camera: the "Photo confirmed" badge itself, plus "A photo earns this badge on your profile, so a match can see you are a real person. You can retake it any time in Profile."

### Edit profile (locked for the handover)
- Today app/profile/edit.tsx has name, photo, primary goal and style only.
- TO BUILD: add struggle, age and gender. Without them those three are set once at onboarding and can never be corrected, and matching depends on age and gender. This is what makes removing the onboarding skips safe.
- Energy is deliberately excluded: it asks how you feel THIS week, so it is re-asked, not edited.
- Changing age or gender should re-run matching preferences on the next search.
- Saves to the same columns onboarding writes: primary_goal, main_struggle, accountability_mode, age_range, gender.
- An Edit profile screen was added to the app-flow prototype (Profile -> Edit profile).

### Bug: buttons with an icon
Any button given an icon but not the row layout rendered the SVG at full width and broke the button ("Take photo", "Share invite", "Send a new link"). Fixed at the source: a button with an icon now always gets the flex row layout. Same fix applied in all three prototypes. For the app build: the icon prop should imply the row layout rather than needing a second flag.

### Also
- Profile's photo row is always shown now: "Add your photo", or "Retake your photo" once there is one.

## 2026-09-26 — Onboarding cut from 15 screens to 10
Principle (Dinesh): onboarding must not do another tab's work.

New onboarding, in order: Intro, Goal, Struggle, Style, About you, Energy, Reveal, Add your photo, Pick a challenge, Partner choice. Nothing else.

REMOVED / MOVED:
- Starting point (how much, how often): REMOVED. The commitment is shared, so both people set it when they plan their first session. Nobody inherits a number they never agreed to.
- "Find: done this before" (capability): DROPPED ENTIRELY. Matching now uses activity + age + gender + location only. Trade-off accepted: the algorithm loses its deliberate-asymmetry input (pairing a steady person with someone stretching).
- "Find: two quick questions" and "Find: searching": MOVED BACK INTO THE FIND TAB. They were only ever in onboarding because "Find the right partner" was a shortcut.
- Your why: MOVED to just after the first session is planned. It is asked once, at the moment it means something, and it is shown on Session Details. Editable from Profile afterwards.

Partner choice is now a HANDOFF, not a flow: both cards end onboarding and open the Find tab. "Find the right partner" opens Find at its two questions, then the radar; "Invite someone you know" opens Find at the invite sheet with the code. This fixes Dinesh's point that a user who matched during onboarding never saw the Find tab.

Nothing is agreed until the pair agrees it: before the first plan the challenge shows as just "Running" with "You'll agree how much and how often together", and no x/y weekly counts anywhere. After the first plan it reads "Run 2x a week, 3 km each time". Applied to all three prototypes.

Invitees: Intro through Add your photo, then straight to Home (they inherit the partner's challenge and already have a partner). They get the why when the pair plans their first session.

## 2026-09-26 — Partner choice: three fixes
1. Select then Continue. The two cards are now selectable and a Continue button (disabled until one is picked) ends onboarding. Matches every other onboarding screen, and stops a single accidental tap from launching a partner search.
2. BUG fixed: "Invite someone you know" did nothing. When the screen became a pure handoff, the button kept logic that only navigated if you were NOT already on that screen, so it just redrew. It now opens the invite sheet.
3. "Find the right partner" no longer jumps into the questions. Continue lands on the Find tab in its landing state with the radar waiting; tapping the radar is the intent gesture, and only then come the two questions and the search. This restores the "pure intent gesture" from the original Find spec.
Invite path: Continue opens the invite sheet (message + 6-character code) inside the Find tab.

## 2026-09-26 — Invite message is activity only
The default invite message carried the distance and cadence ("...to run 3 km, 2x a week"), left over from the removed Starting point screen. An invite always goes out BEFORE a partner exists, so nothing is agreed yet and the message must not claim otherwise.
New format: "{Name} is challenging you to {activity}. Are you up for it?"
  run "go for a run", jog "go for a jog", walk "go for a walk", cycle "go for a ride", yoga "do yoga", workouts "do {exercise}" (e.g. "do pull-ups").
Still editable by the sender. A line under the box says how far and how often is not in the invite and will be agreed together once they join.
Minor open: "do plank" reads awkwardly; per-exercise grammar (a plank / planks) not worth building yet.

## 2026-09-26 — Five fixes (onboarding invite, copy, energy copy, explore)
1. BUG: Back from the invite screen did not return to Partner choice. The handoff cleared the history; it now pushes it, so Back goes to Partner choice from onboarding, and to Find or Home when the invite is started from there.
2. BUG: "Copy link" copied only the message. The share option is now "Copy" and it copies all three lines: the message, the link, and "Code: XXXXXX". The confirmation shows exactly what was copied. The share sheet says all three always travel together whichever option is picked.
3. Removed "You'll agree how much and how often together" from the Partner choice card. It now shows just the activity.
4. First-week copy must not imply a daily commitment (cadence is 1x, 2x or 3x a week):
   medium: "A steady pace: build the habit daily" -> "A steady pace: build the habit as you go"
   low: "A gentle start: one small win a day" -> "A gentle start: one small win at a time" (same problem, changed for consistency; revert if unwanted)
   high: unchanged ("A strong start: momentum from day one" refers to starting, not cadence)
5. Removed "I'll explore on my own" from the onboarding intro. Every user builds a profile: matching needs age and gender, and there is no route back into those questions from Home. The only way to an empty Home is now ending a challenge.

## 2026-09-26 - Welcome, auth legal line, invite needs-auth, reveal back

Prototype: Choner app - splash to Home (Version 18).

1. Welcome screen: the second button now reads "Create an account", not "Sign up". Same words
   everywhere the account is made (the Sign up screen's own title and button already said
   "Create account"), so nobody has to work out that the two are the same thing.
   The rail/screen name stays "Sign up" as an internal label only.

2. Welcome screen: the legal line ("By creating an account you agree to our Terms of use, privacy
   and policy & cookie policy") is removed. Welcome now carries the wordmark and the three ways in,
   nothing else.

3. The legal line moves to the bottom of the two screens where the agreement is actually made:
   - Sign up: "By creating an account you agree to our ..." (verbatim as it was on Welcome)
   - Sign in: "By continuing you agree to our ..." - signing in does not create an account, so the
     original wording would be wrong there. Change it back if you want the two identical.
   Both link to the same legal screens (Terms / Privacy / Health).
   OPEN ITEM: Sign up now states the agreement twice, once as the tick box ("I agree to Choner's
   Terms, Privacy Policy, and Health Disclaimer.") and once as the line at the bottom. One should go.
   The tick box is the one that records consent, so the line is the candidate for removal on that
   screen. Not changed yet - needs a decision.

4. Invite result, "One step first" (signed out, code entered): the single Continue button that sent
   people back to Welcome is replaced by the two real ways in, styled exactly as on Welcome:
   - "Sign in" (filled orange)
   - "Create an account" (orange outline)
   Welcome was a dead stop: it asked the person to choose again, on a screen that also offers
   "I have an invite code", which they had just used. The pending code survives either route and is
   redeemed the moment they are signed in (verified: enter code signed out -> Sign in -> demo
   account -> "You're in!"). Back from either screen returns to "One step first".

5. Onboarding Reveal (O7): added a back button. It was the only onboarding step with no way back,
   so an energy answer could not be changed once the person saw what it produced. Back returns to
   Energy (O6).

6. CSS: .acts (the stacked full-width button column) was scoped to .welcome only; it is now global,
   so the same button stack can be reused on any screen. This is what the invite result now uses.

## 2026-09-26 - Home delegates, Find owns every partner path

Prototypes: splash to Home (Version 19), Home states (Version 9).

THE RULE (applies to every tab, not just these two):

  1. A button on Home may only CHANGE TAB. It never opens a screen, a sheet or a dialog.
  2. It lands on the receiving tab's own TOP screen, never mid-flow.

Home was not just duplicating Find's buttons, it was running Find's work. The giveaway was in the
prototype itself: the invite screen was filed under Home (H3) but drew the FIND tab as active in its
own nav bar. A Find screen wearing a Home label.

What was removed from Home:

  | State            | Was                          | Did                                              |
  |------------------|------------------------------|--------------------------------------------------|
  | No partner       | Find my partner              | confirm dialog, then set the searching state FROM HOME |
  | No partner       | Invite someone you know      | opened the invite/share screen, never touching Find    |
  | Searching        | Invite someone you know ...  | same, opened the invite screen from Home               |
  | Half-done search | Continue                     | jumped into the MIDDLE of Find's questions (q2 or q3)  |
  | Half-done search | Invite someone instead       | opened the invite screen from Home                     |
  | Ended match      | Find my partner              | set the searching state from Home                      |

What Home shows now - one control per state, every one a pure tab switch:

  no partner / ended / half-done search  ->  [ Find a partner ]   -> Find tab, top screen
  searching                              ->  the pulsing "Searching >" row only, no button
  invited                                ->  [ See your invite ]  -> Find tab
  match found                            ->  [ See your match ]   -> Find tab

Find's own screen already carries all three doors (the radar, "Invite someone you know", "Have an
invite code?"), so the choice is made in one place, the search state can only be set from one place,
and the one-at-a-time confirm lives with the thing it guards.

Note on the "too many redirects" worry: a home surface handing you to the tab that owns the job is
the standard pattern (Instagram "Find people to follow" -> Search, Strava "Find friends" -> Athletes).
What felt heavy was not the tab switch, it was tap -> dialog -> a screen belonging to another tab,
with that tab lit up underneath. Three surfaces for one intent. It is one move now.

Housekeeping: the invite screen moved from the Home group (H3) to the Find group (T2d, "Find: invite
someone"). The now-unreachable find-open action was deleted from the Home prototype so Home cannot
set the search state even by accident.

STILL OPEN - the identical problem with the Challenges tab. Home's empty states show "Choose a
challenge" and "Start your next challenge", which open the challenge browser (filed under Home as H2,
but it draws CHALLENGES as active in its nav bar). Same shape as the Find overlap, not yet decided.

## 2026-09-26 - Challenges owns the challenge lifecycle

Prototypes: splash to Home (Version 20), Home states (Version 10).

THE RULE, SHARPENED. The earlier wording ("a Home button may only change tab, no sheets") was too
blunt: "Plan a session" is already a sheet opened from Home and that is correct. The real line is:

  Home may open a sheet ABOUT the commitment it is already showing (Plan a session, View session).
  Home may never open one that STARTS or ENDS another tab's lifecycle.
  Starting a search, sending an invite and picking a challenge are all a tab switch.

OWNERSHIP:
  Find       - every partner path: search, invite, code, stop, switch, cancel
  Challenges - the whole challenge lifecycle: create, end, cancel, history
  Home       - the current commitment, and only that

The picker was reached from four places with near-identical buttons, and drew CHALLENGES as its
active tab while filed under Home (H2) - the same tell as the invite screen.

  | Surface                     | Was                                  | Now                                   |
  |-----------------------------|--------------------------------------|---------------------------------------|
  | Home, no challenge          | "Choose a challenge" -> picker       | "Go to Challenges" -> Challenges tab  |
  | Home, challenge complete    | "Start your next challenge" -> picker| same label -> Challenges tab          |
  | Find, no challenge          | "Choose a challenge" -> picker       | "Go to Challenges" -> Challenges tab  |
  | Challenges, no challenge    | "Create my first commitment"         | unchanged - THIS is the owner         |
  | Challenges, complete        | (nothing)                            | "Create my next commitment" -> picker |
  | Challenges, active          | "Browse challenges / Start another"  | REMOVED. One active commitment at a   |
  |                             |                                      | time; a line says so instead          |

The just-finished moment follows the same rule, deliberately. Completing sends them to Challenges,
where the finished challenge lands in the history before they pick the next: finish, look at what
you did, then choose again. Considered and rejected: an inline exception for momentum.

The picker moved from the Home group (H2) to the Challenges group (T1a, "Challenges: create a
commitment"). On create it still lands on Home, which then asks for a partner - creating a
commitment is a setup action and setup actions finish on Home, the same way onboarding does.

NOTE FOR GAYAN: the no-challenge Home is currently unreachable in the splash-to-Home prototype.
Since "I'll explore on my own" was removed, onboarding always creates a challenge, and the only
route to an empty Home is ending or finishing one, which lives in the Challenges prototype. The
state is still specified and coded; use the "No challenge" preset in the Home states prototype to
see it.

OPEN, MINOR: label style is now mixed. Find and Challenges empty states say "Find a partner" (names
the goal) and "Go to Challenges" (names the destination). Pick one convention before build.

## 2026-09-27 - Copy fixes, the why becomes private, plan labelling

Prototype: splash to Home (Version 21).

COPY
1. Struggle (O3): removed "This is more common than you think."
2. Style (O4): subtitle replaced. Was "This shapes your nudges and how your partner challenge feels
   day to day." Now "This shapes how Choner supports you and how your partner challenge feels."
3. Reveal (O7): the summary row labelled "Your challenge" now reads "Your struggle". "Challenge"
   means the commitment everywhere else in the app, so the old label pointed at the wrong thing.

THE WHY IS PRIVATE - this is a behaviour change, not just copy.
4. Removed "Gayan sees one of these, so they know what they are showing up for" from Your why (H5a).
5. Removed the "Why Gayan is doing this" card from Session Details (H6). Nobody sees anybody else's
   why. It is a commitment device for the person who wrote it, and it comes back only to them, from
   Profile -> "Why you're doing this".
   Considered and rejected: keeping it shared but unannounced, and keeping it shared with lighter
   wording. The decision was to match the behaviour to the removed sentence rather than keep a
   quiet one.
   TO BUILD: whatever writes the reflection must not expose it to the partner. Check the RLS on
   the reflections table - it currently has to be partner-readable for the Session Details card.

THE WHY FLOW, for the record (it was asked about and was not written down anywhere):
   Your why (H5a)      asked ONCE, automatically, the moment the pair confirm their FIRST session.
                       Moved out of onboarding on purpose: it means something only once there is a
                       real session and a real person. One answer minimum, whole set skippable.
                       An invitee who already has a profile also lands here after accepting.
   Edit your why (H4)  reached from Profile -> "Why you're doing this", which shows the current
                       answer as its subtitle, or "Not answered yet". Same four questions.
   Both render the same component (reflect(), four questions, three answers each plus "Something
   else"). The old note saying Edit your why is "a modal from the reminder card on Home" was stale;
   that card was removed from Home. It is a Profile row.

PLAN A SESSION WITH A CADENCE OF 2 OR 3
6. Reported as a bug: pick 2x a week, then only one day can be chosen. It is not a bug, it is the
   locked "one session planned at a time" decision - but the screen never said so, which is why it
   read as one. Kept the model, labelled it:
     - a "Commitment 1 of 2 this week" heading above Day, shown only when the cadence is 2 or 3
     - it counts up as sessions are kept (verified: completing the first shows "Commitment 2 of 2")
     - footer now reads "One at a time. The next one is planned as soon as this one is done."
   Considered and rejected: asking for all N day+time pairs up front (reverses the locked decision,
   and a moved or missed first session then has to reshuffle an already-agreed second), and an
   optional "plan the rest too" (two paths to build and test for a rare want).

PROTOTYPE DEAD END (my gap, not a product issue)
7. Home in the searching state had no way forward: stripping it to one row on 26 September removed
   its last button, and unlike the invite path there was never a "simulate a match" control. Added
   "Simulate: you're matched" to Home (searching), the Find tab (searching) and the Find searching
   screen, and "Simulate: your friend joins with the code" to Home (waiting). Dashed prototype
   controls, not app UI.

ALREADY DONE, RE-CONFIRMED - the five Find location items were all applied earlier and are live in
both the Find prototype and the Find screen inside the app flow: maximum 2 locations, closable chips
with an x, the keyboard blurs when a chip is added, suggestions only appear once typing starts, and
"Typical Pace" appears in no prototype.

## 2026-09-28 - Tab order, and mode decided before location

Prototypes: splash to Home (Version 22), Home states (Version 11), Challenges tab (Version 7).

TAB ORDER
1. Now Home, Challenges, Find, Community. Was Home, Find, Challenges, Community.
   Changed in all three prototypes.

MODE BEFORE LOCATION - the real fix

The problem found: location was collected from EVERYONE in the Find form, before the match, and
used as a hard block. But whether it should block depends on a mode answer the app did not collect
until the FIRST PLAN, after the match. The Find prototype note even said it out loud: "No mode, no
distance, no time here." Meanwhile Choner_Matching_Algorithm_v2_Scoring.md 5.6 already specified
that zero shared location tags is a hard block for together and IRRELEVANT for separate - a rule
with no mode answer to key off.

Two consequences, the second worse than the first:
  a. Someone who only ever wants to do it separately had their pool cut by geography for nothing.
  b. Two people could match and only then discover they wanted incompatible modes. Nothing stopped
     a meet-in-person person being paired with someone who would never meet.

DECIDED:
2. "How do you want to do this?" moves into the Find form and is asked FIRST, before location,
   because it decides whether location is asked at all. Three options:
     In person              Meet up and do it side by side.
     Separately, together   Same commitment, your own place, your own time.
     Either works           Show me both. You will decide together.
3. It is a HARD FILTER, not a score. Allowed pairings:
     person + person     yes        person + either    yes
     either + either     yes        either + separate  yes
     separate + separate yes        person + separate  NEVER
   Nobody can match into a mode conflict any more. Rejected: weighting it in scoring to keep pools
   larger at launch, because that just moves the conflict to the first plan.
4. Location is asked ONLY of people who could actually meet (In person or Either). Someone who
   picked Separately never sees the question at all. Rejected: asking it as an optional field to
   keep them visible on the Choner Pulse area tiles.
5. Consequence at the first plan: "How will you do it?" no longer asks for the first time there.
   When either side chose Separately the pair cannot meet, so the mode is shown as a plain
   statement and NO place is asked, because there is nothing to agree. When both could meet, both
   options stay, so a rainy week can be done separately without changing the match.

Verified end to end in the prototype: In person shows the location question and blocks Continue
until a location is picked; Separately hides it and Continue is enabled on mode plus gender alone;
Either shows it again. Following each path through to the first plan: the in-person pair gets Day,
Time and Place plus both mode choices; the separate pair gets Day and Time only, with the mode as
a statement and zero mode buttons.

CARRIED OVER, not yet wired: the Challenges tab prototype still offers both modes unconditionally
on its plan screen. It has no Find form, so it cannot know what the pair chose. Noted in the
prototype rather than faked.

TWO THINGS FIXED IN PASSING
6. The Find form kept a stale area search query if you left it mid-typing and came back, so the
   suggestion list reappeared before any typing. It now clears on entry.
7. DRIFT CAUGHT: the Challenges tab prototype was still showing "Why Gayan is doing this" on
   Session Details. The why was made private on 27 September and the card removed from the app
   flow, but not here. Removed, and the note corrected. Two prototypes disagreeing on a locked
   decision would have sent Gayan the wrong way.

ALREADY DONE, RE-CONFIRMED - the five Find location items are all live in both the Find prototype
and the app flow: maximum 2 locations, closable chips, the keyboard blurs on add, suggestions only
after typing starts, and no "Typical Pace" anywhere.

## 2026-09-28 (later) - All 68 locations, dropdown only, and the Challenges mode control

Prototypes: splash to Home (Version 23), Challenges tab (Version 8).

LOCATIONS
1. All 68 are now in the prototype. It previously carried only 15 placeholders. The list is read
   from supabase/migrations/202609181900_location_corridors.sql, so labels match the database
   exactly and a pick maps straight to locations.value. Grouped as the migration groups them:
     Colombo city     27  (Fort (Colombo 1) ... Madampitiya (Colombo 15))
     Greater Colombo  41  (Ambatale ... Wickramasinghapura)
2. The picker is now a plain grouped dropdown. No typing at all.
     - pick one, it becomes a closable chip and leaves the list
     - pick a second, the dropdown disappears entirely
     - remove a chip, the dropdown comes back
   REVERSES the 25 September decision ("locations should only be visible as a drop down when they
   start typing"). Reason to prefer the new one: the 68 locations are the entire vocabulary, and
   free text lets someone enter a place that cannot be tagged or matched at all. Noted in the
   prototype so the old behaviour is not rebuilt.
3. Removed the now-dead type-ahead code: locSuggest(), the #loc-in text field, its input handler,
   the blur-on-add, and the S.locQ writes that no longer had a reader.

CHALLENGES PROTOTYPE: "PAIR CAN MEET"
4. The problem: the three prototypes are separate programs. The splash-to-Home one contains the
   Find form, so it knows the mode and gates the plan screen on it. The Challenges one starts the
   user already paired, has no Find form, and so was offering "Together, meet up, confirm with a
   QR code" plus a place field to pairs that may never meet.
5. Added a "Pair can meet: Yes / No" control above the phone, backed by S.canMeet.
     No  = one of them chose Separately in Find. The mode becomes a plain statement, no place is
           asked, the completion screen's next-session plan drops its mode pills, and the day-of
           flow drops the QR step, because there is nothing to confirm being together for.
     Yes = both options stay, so a rainy week can be done separately without changing the match.
   Flipping to No also rewrites any sessions already on screen, so nothing is left claiming
   "Mode: Together" for a pair that can never meet.
   Rejected: two extra rail presets (cannot flip an existing scenario without losing your place),
   and leaving the note as it was (kept showing a mode choice wrong for half of all pairs).

Verified: 68 options in two correctly sized groups; chip add, cap at two, and removal all behave;
152 screen/state combos in the app flow and 44 preset/mode combos in the Challenges tab, no errors.

## 2026-09-28 (later still) - "Either works" kept; the first plan becomes a proposal

Prototype: Challenges tab (Version 9).

EITHER WORKS - challenged, kept
1. Challenged on why anyone would pick "Either works", and whether three options is too much at
   the start. The honest answer: it exists for POOL SIZE, not for the person choosing it. Without
   it the matcher has two disjoint pools and at launch that is thin. A weakness worth naming: it
   still asks for locations, so picking it saves the person nothing - same form, same length as
   "In person". It buys ambiguity, not simplicity.
   Alternatives put up and declined: a single yes/no ("Can you meet a partner in person?") with
   geography demoted to a scoring preference, and a strict two-option split.
   DECISION: keep the three options as built. Revisit if match rates are poor at launch.

THE MODE CONFLICT - what happens when the two disagree
2. The question: User 1 picks Together at the first plan, User 2 picks Separately. What happens?
   The honest answer was: UNDEFINED. The prototype cheated. Move and cancel already had a real
   proposal model, but the FIRST PLAN did not - it just applied whatever one person chose, with a
   hint underneath admitting "Shown here as agreed".
   Who can even hit it: only pairs where BOTH can meet (person+person, person+either,
   either+either). Pairs including a Separately-only person show the mode as a statement, so no
   conflict is possible there.
3. DECIDED: mode rides in the proposal, alongside day, time and place. Whoever plans first
   proposes the whole session; the other accepts or suggests another. There is NO separate
   mode-conflict state, because only one person is ever setting the value.
   Rejected: "Separately always wins" silently (reads like a bug to the person who wanted to meet)
   and a dedicated conflict screen (more to build for a case the proposal model already covers).
4. The asymmetry that settles ties: Separately can always be delivered by one person, Together
   needs both. You cannot make someone turn up at a park. So a responder who counters with
   Separately gets Separately.
5. Mode is asked on EVERY plan, not agreed once, so a rainy or travel week can be done separately
   without touching the match. Rejected: agree once at the first plan with a "do this one
   separately" escape on the session.

BUILT IN THE CHALLENGES PROTOTYPE
  - "Confirm plan" is now "Send to Gayan" everywhere, including the next-session plan on the
    completion screen.
  - No session exists until both agree. The card shows "Waiting for Gayan to accept Together ·
    Friday · 7:00 AM. Nothing is planned until they do."
  - New control "Gayan: suggests another" returns a counter-proposal, flipping the mode where the
    pair can meet.
  - The counter shows as "Gayan suggested Separately, together · Sunday · 6:30 AM" with
    Accept / Suggest another. Suggest another reopens the plan screen prefilled with Gayan's
    values and a line saying what is being answered.
  - Accepting creates the session from the PROPOSED values and confirms with an "Agreed" dialog.

Verified: the full round trip (propose, counter, counter back, accept) lands a Sunday 7:00 AM
separate-mode session; no session is created while a proposal is open; move and cancel proposals
still behave after the card logic was restructured; 44 preset/mode combos clean, no errors.

STILL NOT WIRED: the splash-to-Home prototype's plan screen still applies the plan directly. It
shares the same decision but has not been converted to the proposal model.

## 2026-09-28 (final) - The proposal model carried into the app-flow prototype

Prototype: splash to Home (Version 24). Both prototypes now agree.

1. "Confirm plan" is "Send to Gayan" on the plan screen. Nothing is planned until Gayan accepts:
   the commitment state does not advance, and Home shows a "Waiting for Gayan" card carrying the
   proposed mode, day, time and place, with the line "Nothing is planned until Gayan accepts."
2. New control "Gayan: suggests another" sends a counter back. Home then shows "Gayan suggested a
   change" with Accept / Suggest another. Suggest another reopens the plan screen prefilled with
   Gayan's values and a line saying what is being answered.
3. The Challenges tab shows the same pending state: "Waiting for Gayan to accept your plan", or
   the Accept / Suggest another pair when the counter is from Gayan.
4. Accepting applies the PROPOSED values (mode, day, time, place, and on a first plan the amount
   and cadence) and confirms with an "Agreed" dialog on later plans.
5. CONSEQUENCE, and it is an improvement: the why is now asked after Gayan ACCEPTS the first
   session, not when one person confirms it. That is the moment the pair actually agree, which is
   what the why was always supposed to follow.
6. A separate-only pair is unaffected: the plan screen still shows the mode as a statement with no
   place field, and the proposal carries "Separately, together".

BUG FOUND AND FIXED WHILE BUILDING: dlg() was called before go(), and go() calls leave(), which
clears S.dlg. The "Agreed" confirmation was being created and then wiped by the navigation on the
same tick. Reordered so go() runs first.

Verified: first plan (propose, counter, counter back, accept) ends on the why with the countered
values carried through; a later plan ends with the Agreed dialog and the commitment state advanced;
the commitment state does not move while a proposal is open; the separate-only path proposes
Separately with no place; 152 screen/state combos clean, no errors.

## 2026-09-29 - Every screen filed under the tab that owns it

Prototype: splash to Home (Version 25).

Spotted: "Plan a session" was filed under HOME in the rail. It should be Challenges. True, and it
was not the only one. Six screens sat in the HOME group and FOUR of them already drew the
Challenges tab as active in their own nav bar, the same tell that exposed the invite screen and
the challenge picker earlier:

  H5  Plan a session      -> drew Challenges
  H5a Your why            -> drew Challenges
  H6  Session details     -> drew Challenges
  H7  Confirm with QR     -> drew Challenges
  H4  Edit your why       -> no nav; reached from Profile
  H1  Home                -> drew Home

Their own notes already said it: plan read "Owned by the Challenges tab; Home opens it", QR read
"Owned by Challenges; Home opens it when both are here."

MOVED:
  plan     -> T1b  Challenges: plan a session
  commit   -> T1c  Challenges: session details
  qr       -> T1d  Challenges: confirm with QR
  why      -> T1e  Challenges: your why
  editwhy  -> T4b  Profile: edit your why

The HOME group now holds exactly ONE screen, Home itself. That is the rule made visible: Home owns
the current commitment and nothing else. Everything it opens belongs to another tab and is filed
there. Home may still OPEN Plan a session and Session details, because those are about the
commitment Home is already showing; filing is about ownership, not about who can open it.

This is the root cause of the whole overlap family found on 26-28 September. The rail grouping
described the user's journey, not ownership, so screens drifted into Home and picked up Home
behaviour. With the rail matching ownership the drift is visible at a glance.

Verified: rail groups read correctly, 152 screen/state combos clean, and Back/Next still walks all
37 screens end to end with no errors.

---

## 2026-09-29 (later) - Consent recorded once, in the tick box

Master spec open item 5 is now closed. Sign up stated the agreement twice: the tick box in the
form and `<TermsFooter />` at the bottom. Only one of them records anything, so only one should
be there.

DECIDED: keep the tick box, put the links inside its own label, delete the bottom line from Sign
up. The tick box is the thing that writes consent; the footer was decoration next to it.

Sign in keeps its bottom line. It has no tick box, nothing to duplicate, and the line reads
"By continuing you agree to" rather than "By creating an account", so `TermsFooter` still needs
the `lead` prop planned in fe2. The line is gone from Welcome (decided 26 September) and now from
Sign up, so it appears on exactly one screen.

Found while checking this, and it changes the task: the two pieces of copy name DIFFERENT things.

  tick box      "I agree to Choner's Terms, Privacy Policy, and Health Disclaimer."
  TermsFooter   "Terms of use, privacy and policy & cookie policy"

Four documents between them, and each list is missing one the other has. The footer omits the
health disclaimer; the tick box omits the cookie policy. Deleting the footer therefore drops the
cookie policy from the flow unless it is carried across.

DECIDED: the tick box names all four - Terms of use, Privacy policy, Cookie policy, Health
disclaimer - each its own tappable link. The health disclaimer stays because Choner puts two
strangers together to exercise; it is the one document that carries real liability, and it was
only ever in the tick box, never in the footer.

Routing: `app/legal/` has terms.tsx, privacy.tsx and health-disclaimer.tsx. There is no cookie
policy screen. Until one exists the cookie link points at `/legal/privacy`, where cookie handling
belongs anyway. Flagged as content work, not a build blocker.

Also fixed by this: `TermsFooter` currently wraps all three names in ONE Pressable going to
`/legal/terms`, so tapping "privacy" opened the terms page. The tick box version links each
document separately.

---

## 2026-09-29 (later still) - No legal line on Sign in either

Amends the entry above, same day. The bottom line was going to stay on Sign in with the lead
"By continuing you agree to".

DECIDED: remove it from Sign in too. Signing in is not consent, it is proof of consent already
given; the person agreed when they made the account. The documents are reachable from Settings,
which already lists Privacy, Terms and Health disclaimer
(`app/settings/index.tsx:119-131`).

The legal line therefore appears on NO screen. It is gone from Welcome (26 September), from Sign
up (earlier today, the tick box carries it) and now from Sign in.

Consequence for the build, and it makes fe2 smaller: `components/auth/TermsFooter.tsx` has exactly
one caller, `app/(auth)/welcome.tsx:64`. fe2 already deletes that call. So the component becomes
dead code and is deleted with it. The `lead` prop the plan called for is not needed, and neither
is the work of adding the line to Sign in and Sign up.

---

## 2026-09-29 (final) - The language flow: no "commitment" before there is one

From `Choner_Emotional_Start_to_Commitment_Language_Flow.md`. This also settles the fe8 button
label question, which was open.

The principle: **do not use the word "commitment" before two people have agreed a plan.** A
commitment should read as the RESULT of choosing something, finding someone and agreeing to show
up, not as a form the app hands you on arrival.

Five moments, each with its own voice:

  1  nothing picked        Start something together / Pick what you want to do with your partner.
                           / [Let's do this]
  2  activity picked       Let's make it happen / Find someone who wants to do it too.
  3  partner accepted      You found your match / Now let's plan your first one.
  4  both agreed a plan    You're in / You've got something to show up for together.
  5  from then on          Your commitment

Applied across all three prototypes. Every user-facing use of "commitment" BEFORE moment 4 is
gone; every use after it stays.

  Home, no challenge      "Ready when you are" + "Pick your first commitment in Challenges..."
                          + [Go to Challenges]        -> moment 1
  Home, no partner        eyebrow "Your first commitment"
                          + "Someone to show up with is all that's missing."  -> moment 2
  Home, accepted          "You found your person"     -> "You found your match"
  Heart card, accepted    "Your first shared commitment is next."
                          -> "Your first one together is next."
  Challenges, empty       "No active commitment" + "Your first commitment starts here."
                          + [Create my first commitment]                      -> moment 1
  Challenges, hero        "Active commitment" -> moment 2 before agreement, "Your commitment" after
  Challenges, subtitle    "What you've committed to." now renders ONLY once agreed
  The picker              header "Your first commitment" -> "Start something together";
                          submit [Create commitment] -> [Let's make it happen]
  Both accept a plan      dialog "Agreed" -> "You're in"
  Challenge complete      [Create my next commitment] / [Start your next challenge]
                          -> [Let's do this]

THIS SETTLES fe8. Home no longer names a destination anywhere: "Go to Challenges" is gone and
Home says exactly what the Challenges tab says, "Start something together" and "Let's do this".
Every Home handoff now names what the user gets, not where the button goes. The convention is one
convention.

Rejected, and why: "Go to Challenges" was defended on the grounds that it warns a tab switch is
coming. But EVERY Home button switches tab, that is the ownership rule, so the warning is not
doing any work. If it were, all six would have to read "Go to ...", and "Go to Find" is unusable.

THREE CALLS MADE WHILE APPLYING IT. Each one is a change the document did not ask for, made
because applying it literally would have produced a collision:

1. NO EMOJI. The document puts a waving hand after "You found your match" and a flame after
   "You're in". Line icons only, no emoji, is a locked rule (master spec section 4), and the
   prototypes already have a `fire` line icon doing exactly that job. Both headlines ship
   without emoji; "You're in" keeps the fire icon it already had.

2. "You're in" was ALREADY TAKEN. The invite-result screen (A7, someone joins with a code) said
   "You're in!" with the fire icon. The document assigns that headline to both people agreeing a
   plan, which is a different, later moment. The invite result now reads "You're connected." and
   keeps the fire and the "Your shared fire is lit" line. Happy to swap these back if the invite
   moment is the one that deserves "You're in".

3. "A match is waiting", a string the document does not contain. Home had "You found a match"
   for a match AWAITING an answer and "You found your person" for one ACCEPTED. Renaming the
   second to "You found your match" put two near-identical headlines one tap apart, so the
   pending one became "A match is waiting", which is what that preset was already called.

Verified: all three prototypes build (placeholder count 0), all three parse under `node --check`,
and all 21 Home presets plus all 22 Challenges presets render with no console errors.

Still to reconcile, not urgent: "Let's do this" is now both the empty-Challenges button AND the
accept-this-person button on the Find match screen. They are never on screen together, but it is
the same phrase for "pick an activity" and "accept this human". The document assigns it to the
first, so the match screen is the one that should change if either does.

---

## 2026-09-29 (build) - What the frontend stages actually decided

Ten branches landed (fe0 to fe9, fe11; fe10 waits on Gayan). Most of it was
already decided above and only executed here. These are the things the code
forced a decision on.

BUTTONS WERE THE WRONG SHAPE, EVERYWHERE. The plan said `theme.radius.lg` was
already the prototypes' 18. It is 28. Every button in the app has been rendering
at 28. `lg` is also the corner of cards and sheets, which are deliberately
rounder, so buttons got their own token (`radius.button: 18`) rather than
changing `lg` underneath everything. This changes every button in the app,
including on frozen screens: it is a design-system correction, not a screen
rewrite.

RESET PASSWORD SENT PEOPLE TO HOME. `router.replace('/(tabs)/home')` skipped
onboarding for anyone who reset their password before finishing it. Now
replaces to `/`, and the index gate decides.

THE ICON PROP IS WIDENED, NOT NARROWED. `OptionCard.icon` and
`PromiseCard.icon` are typed `string` and rendered as TEXT in eleven callers
outside this slice, all on frozen screens. Narrowing to an icon-key union would
have broken every one of them. Instead a registered key draws the line icon and
anything else still renders as text, so the frozen screens keep their emoji and
keep compiling until their turn comes. `Chip` already took `React.ReactNode`,
so this matches a pattern the codebase had.

TARGET.TSX IS DELETED, NOT MOVED. It asked how much and how often on a DAILY
scale (Daily, 5x, 4x, 3x a week). Both numbers are agreed by both people at the
first plan now, so asking one person during onboarding produced a value the
first plan immediately overwrote. Nothing replaces it.

WHY.TSX MOVED TO app/challenge/. It is a Challenges screen: asked once, the
moment the first session is agreed. Five callers repointed. Its handoff was
also wrong after the move - it sent non-invitees back into onboarding to find a
partner, which only made sense while it lived in the onboarding stack. It goes
to Home for everyone now, because by the time it is seen both people have a
partner.

INVITE.TSX STAYS, DOING TWO JOBS, ON PURPOSE. Its onboarding role moved to the
new partner.tsx. But `app/(tabs)/find.tsx:280` and
`app/(tabs)/challenges.tsx:394` both push to it, and both are frozen. Deleting
or rewriting it would break two screens nobody is allowed to touch. It carries a
comment saying so and retires when Find is rebuilt.

"ONE SMALL WIN A DAY" WAS A DAILY-TASK PRODUCT. `energyToFirstWeek` read "one
small win a day" and "build the habit daily". A commitment is a weekly number
two people agree, so those strings described something that no longer exists.
Changed to match the prototype: "one small win at a time", "build the habit as
you go".

THE SKIPS COULD ONLY GO AFTER EDIT PROFILE COULD WRITE. fe9 waited on fe5 for
exactly this reason: without a way to correct goal, struggle, age and gender
afterwards, removing the skips would have made a wrong answer permanent.

OVERLAP FOUND, NOT RESOLVED: Gayan's task 8 ("Edit profile writes three more
columns") is the same work as fe5. It is a frontend change sitting on the
backend list. fe5 has done it; his task 8 should be struck or reduced to the
migration side, or it gets built twice.

Branch order matters and they stack: fe1 needs Icon.tsx, fe2 needs fe1, and so
on down to fe11. Merging out of order shows the wrong diff.

---

## 2026-09-29 (migrations) - Two columns share a name and only one is broken

Drafting the SQL for Gayan's tasks turned up a mistake in the task list itself.

`accountability_mode` exists TWICE and the handover treated it as one column.

  profiles.accountability_mode       holds the TONE, and is already CONSUMED as
                                     the tone: four matching RPCs read it as
                                     coalesce(p.accountability_mode,
                                     'encouraging') as style. Nothing about its
                                     meaning is ambiguous in practice. Only the
                                     NAME and the 'solo' DEFAULT are wrong.

  user_challenges.accountability_mode  genuinely means solo / partner, and
                                     around fifteen migrations plus every
                                     partner RPC branch on = 'partner'.

So the "split" is much smaller than written, and also much more dangerous than
written in one specific way: removing solo mode from user_challenges touches
the whole partner path and belongs to the Challenges rebuild, not to a column
rename. The drafts only drop its dead default.

A footnote worth keeping: 202603261510:23 renamed accountability_style to
accountability_mode. The original name was correct. The rename is the bug being
undone, which is why the new column takes the old name back.

DECIDED: expand/contract rather than a rename. Two people are working on
opposite sides of this column, and a rename breaks every writer the moment it
lands and every reader the moment it does not. Add the new column, backfill,
keep both in step with a trigger, drop the old one behind a gate that refuses
to run while the two disagree. Either side can land first.

DECIDED: the photo reuses the avatars bucket. 202607311000 already created it
with the exact policies needed and profiles.avatar_url already holds the URL. A
second bucket is a second set of RLS policies to keep correct for no gain.

DECIDED, and this is the part that matters: a gallery upload DROPS the photo
badge. Edit profile still uploads from the gallery into the same bucket and the
same column, so without a rule a gallery photo would inherit a badge that a
live capture earned weeks earlier. Any change to avatar_url that did not come
through set_live_photo() resets photo_status, and photo_status cannot be set to
confirmed by hand at all. The badge is the thing a stranger reads before
agreeing to meet someone in person; it must not outlive the photo that earned
it. This is why "Photo confirmed" is defensible and "Photo verified" would not
be even with this rule.

DECIDED: the short invite code sits BESIDE the 36-character token rather than
replacing it. The token is the deep-link payload and is unguessable; the code
is the human path. Acceptance is a thin wrapper over accept_challenge_invite,
which has been redefined eight times and whose latest body carries the
single-challenge rules - resolving the code to a token and delegating keeps all
of that in one place instead of making it nine.

Alphabet excludes O, 0, I, 1, L and U: the characters people misread aloud or
mistype, and U also keeps the generator from spelling things.

STILL OPEN, not resolved silently: what happens when someone who already has an
active challenge enters a code. Restated at the bottom of the migration.

OVERLAP CLOSED: Gayan's task 8 (Edit profile writes three more columns) is a
frontend change that fe5 has already done. Marked as done on his list rather
than deleted, so it is visible instead of being built twice.

NOT RUN. There is no Docker and no psql on this machine, so the five files are
statically checked only: dollar-quoting balanced, every referenced table and
column verified against the migration history. One real bug was caught that
way - uc.template_id was renamed to challenge_template_id in 202603261600:27,
so the first draft of the invite-prefix function would not have compiled. They
need supabase db reset against a local stack before they go near anything real.
