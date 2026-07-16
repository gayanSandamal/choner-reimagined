# Choner — Onboarding Screens 1–7 (Final Spec for Implementation)
**Prepared for:** Gayan Sandamal, Co-Founder & CTO
**Prepared by:** Dinesh Doluweera, Co-Founder & CEO
**Version:** Final — July 2026
**Supersedes:** All earlier onboarding spec versions (v1.0 and the challenge-type sections of v2.0)

---

## Core Model

Choner's prototype is centered on **one specialized feature: Partner Challenges (1:1 accountability)**. Users invite one real person to commit to a habit challenge together. No group, public, competitive, or custom challenge types at this stage.

**BIE (Behavioral Intelligence Engine) is not built yet.** All personalisation shown in onboarding is rule-based logic, not AI. Do not reference "BIE" anywhere in the prototype UI. Use language like "Choner adapts / adjusts / reads" — never "learns" or "AI."

---

## Global Design Rules (All 7 Screens)

- Screens 1–7 render **outside the main app shell** — no bottom nav, no header menu, no hamburger icon. Full screen, immersive, focused.
- The app shell (bottom navigation) wraps the experience **from the home screen onwards only**.
- Primary CTA is disabled until a selection is made on Screens 2, 3, 4, and 5.
- Colors: background `#0d1b2a` · accent `#f4832a` · card `#111f2e` · card border `#1c3349` · muted text `#5a7a92` · white text `#ffffff`

### Progress Dots

5 dots total. Screen 1 sits outside the 4-step quiz.

| Screen | Dot 1 | Dot 2 | Dot 3 | Dot 4 | Dot 5 |
|--------|-------|-------|-------|-------|-------|
| 1 — Welcome | Active | Off | Off | Off | Off |
| 2 — Primary goal | Done | Active | Off | Off | Off |
| 3 — Main struggle | Done | Done | Active | Off | Off |
| 4 — Accountability style | Done | Done | Done | Active | Off |
| 5 — Energy check | Done | Done | Done | Done | Active |
| 6 — Profile reveal | No dots (quiz complete) |
| 7 — First challenge + invite | No dots |

---

## Screen 1 — Welcome & Promise

**No subline on this screen.**

**Headline:** "Turn 'I should' into 'I did'"

**Small line under headline:** "Takes about a minute."

**Promise cards (icon + title + description):**

| Icon | Title | Description |
|------|-------|--------------|
| 🤝 | One partner, real accountability | Not a crowd, not a stranger's app — one person counting on you |
| 🎯 | Personalised from day one | Your goals and struggles shape your first challenge |
| 📈 | Built to grow with you | More ways to stay consistent are coming |

**Primary CTA:** "Build my profile"
**Ghost CTA:** "I'll explore on my own"

**Design notes:** Logo mark centered above headline. Promise cards: dark card background, subtle border, icon in a small rounded container on the left, title bold white, description muted. Ghost button styled quietly — it's an escape hatch, not a real competing choice.

---

## Screen 2 — Primary Goal

**Step label:** STEP 1 OF 4

**Headline:** "What matters most to you right now?"

**Subline:** "Choner shapes your first challenge around this."

**Options (2×2 grid):**

| Icon | Label | Description |
|------|-------|--------------|
| 🏃 | Move more | Build an active routine |
| 🌙 | Sleep better | Rest and recover well |
| 🌱 | Reduce stress | Feel calmer day to day |
| ⚡ | Improve energy | Stay sharp and focused |

**CTA:** "Continue" · **Skip link:** "Skip for now"

**Used later for:** Pre-filling the suggested challenge on Screen 7.

---

## Screen 3 — Main Struggle

**Step label:** STEP 2 OF 4

**Headline:** "What's stopped you before?"

**Subline:** "Be honest — this is how Choner knows where to support you most."

**Reassurance line (corrected — no fabricated stats):** "This is more common than you think."

**Options (full-width rows):**

| Icon | Label | Description |
|------|-------|--------------|
| 🔄 | I start but stop | Good intentions, hard to stay consistent |
| 👥 | I lack accountability | No one keeping me on track |
| ⏰ | I'm too busy | Life gets in the way every time |
| 😔 | I feel overwhelmed | Don't even know where to begin |

**CTA:** "Continue" · **Skip link:** "Skip for now"

**Used later for:** Screen 6 personality summary, and **Screen 7 copy adaptation** (see Screen 7 notes below — the "I lack accountability" answer changes the invite framing).

---

## Screen 4 — Accountability Style

**Note:** This screen no longer determines challenge *type* — every user gets Partner Challenges. It only shapes the **tone** of nudges and messaging throughout the app.

**Step label:** STEP 3 OF 4

**Headline:** "How do you want Choner to talk to you?"

**Subline:** "This shapes your nudges and how your partner challenge feels day to day."

**Options (full-width cards):**

| Icon | Style | Description | Sets tone for... |
|------|-------|--------------|-------------------|
| 🏆 | Competitive | I like a friendly rivalry | "Who's ahead this week" framing |
| 🔥 | Momentum-driven | I hate breaking a streak | Streak-protection framing |
| 💬 | Encouraging | I need warmth, not pressure | Warm, supportive framing |
| 🤝 | Team-minded | I show up for others | Mutual responsibility framing |

**Commitment anxiety line:** "You can change this any time in your settings."

**CTA:** "This is me — let's go" — **no skip link** (this data still matters enough to require an answer).

---

## Screen 5 — Energy Check

**Step label:** STEP 4 OF 4

**Headline:** "How are you feeling this week?"

**Subline:** "Choner adjusts your first week based on this — no pressure either way."

**Options (3 equal-width pills):**

| Icon | Label | Description |
|------|-------|--------------|
| 😴 | Low | Running on empty |
| ⚡ | Medium | Getting by |
| 🔥 | High | Firing on all cylinders |

**Reassurance line:** "This isn't a test. There's no wrong answer."

**CTA:** "See my profile" — **no skip link.**

---

## Screen 6 — Profile Reveal

**Top label:** "We see you, [First name]"

**Style name (dynamic, from Screen 4):** e.g. "Team-minded"

**Personality summary (dynamic, from Screen 3 + Screen 4 combination):** 2 lines. Example: "You show up for others more than yourself. Choner pairs you with someone who needs you as much as you need them."
*(Full 16-combination logic table is a separate open item — only 4 of 16 combos currently drafted.)*

**Personalised setup card:**

| Icon | Label | Value |
|------|-------|-------|
| 🎯 | Your goal | [Screen 2 answer] |
| 🔥 | Your challenge | [Screen 3 answer] |
| 💬 | Your style | [Screen 4 answer] |
| ⚡ | Your first week | [Based on Screen 5] |

**Muted line:** "Choner will refine this as you build your streak."

**Badge:** "✓ Profile saved"

**CTA:** "Let's set up your first challenge"

---

## Screen 7 — Set Up Your First Challenge (Partner Invite)

**Purpose:** Convert onboarding momentum into the core mechanic — a Partner Challenge — via invite. This is a **non-blocking** ask: users can proceed without inviting anyone yet.

**Top label:** YOUR FIRST CHALLENGE

**Headline (default):** "Let's set this up with a partner"

**Headline (adaptive — if Screen 3 answer was "I lack accountability"):** "This is exactly what you told us you needed" — shown above the standard headline/subline as a lead-in line. All other Screen 3 answers use the standard headline only.

**Subline:** "Choner works best with two. Invite someone to hold you accountable — and you do the same for them."

**Pre-filled challenge card (dynamic, based on Screen 2 goal):**

| Screen 2 goal | Suggested habit |
|---------------|-------------------|
| Move more | Walk for 10 minutes every day |
| Sleep better | No screens 30 minutes before bed |
| Reduce stress | 5 minutes of deep breathing each morning |
| Improve energy | Drink a glass of water first thing every morning |

Below habit: "7-day challenge · Starts once you're both in"

**Primary CTA:** "Invite your partner" → opens contact list / share link / WhatsApp share

**Supporting text below CTA:** "Send it to a friend, partner, sibling, or gym buddy — anyone who'll actually show up."

**Secondary path (consolidated — single option, not two competing links):**
"Skip for now" → tapping this reveals (or leads to) the waitlist option: "We'll match you with someone doing the same challenge when you're ready." No separate, simultaneously-visible "join the waitlist" link — it lives behind the single skip action to avoid two competing secondary CTAs on one screen.

**Pending state (after invite sent):**
- Card updates to: "Waiting for [name] to join Choner"
- "Your challenge starts the moment they sign up."
- Two small options: "Resend invite" / "Invite someone else instead"

**Primary CTA states:**
- Before invite: "Send invite"
- After invite sent: "Waiting for [name]..." (disabled, subtle pulse animation)

**What happens after this screen:**
User lands on home screen with:
- If partner invited but not joined: challenge card shows "Waiting for [name]" — still visually active
- If skipped: home screen shows a calm prompt to invite a partner (see Home tab spec)
- Style badge visible on profile
- Bottom navigation visible for the first time
- **Home screen is never empty**, in any state

---

## Summary of Changes From Previous Draft

1. Screen 1 subline removed entirely; replaced with a short "takes about a minute" line.
2. Screen 3's reassurance line changed from a fabricated stat ("most people pick the first two") to an honest, data-free line ("This is more common than you think").
3. Screen 7 headline now adapts when Screen 3's answer was "I lack accountability," leading with validation before the invite ask.
4. Time estimate added to Screen 1 to reduce onboarding drop-off from unknown-length anxiety.
5. Screen 7's two previously separate secondary paths ("Skip for now" and "Join the waitlist") consolidated into a single "Skip for now" action, with the waitlist offered as the natural next step after skipping — reducing on-screen competing options.

---

*Final onboarding spec — Choner — July 2026*
*For questions contact Dinesh — dinesh@choner.io*
