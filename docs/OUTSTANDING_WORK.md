# Choner — everything still outstanding

**Verified against `origin/main` at `7289a37`, 5 October 2026.**

Frontend first, then backend. Every claim here was checked by reading the code
on `origin/main`, not from commit messages or memory. Where something cannot be
confirmed without a running device, it says so rather than guessing.

This supersedes `docs/FRONTEND_FINDINGS_UNFILED.md`.

## The short version

| | |
|---|---|
| **Frontend, filed on GitHub** | 21 of 25 fixed in code, **all 25 still open** — the board needs closing |
| **Frontend, never filed** | 3 issues (5 findings), below, paste-ready |
| **Frontend, unverifiable from source** | 3 runtime errors (#101, #103, #109) |
| **Backend** | 1 real task (#96), 1 migration to run deliberately, 1 unverified item |
| **Withdrawn** | N1 — does not reproduce, see the end |

Backend is in better shape than the issue list suggests. The weekly model,
partnerships, streak, sessions, proposals, history and Pulse all landed between
30 September and 4 October.

---
---

# PART 1 — FRONTEND

## 1A. The three issues never filed on GitHub

These came out of the 2 October prototype audit and were never turned into
issues, so **Gayan has not seen any of them.** Audit numbering (N1–N8) is kept
so it lines up with earlier notes. N2 (the heart) and N5 (the Home greeting)
were fixed independently when Home was rebuilt from the prototype.

Each one below is paste-ready: title, body, and the prototype line that is the
authority for the change.

---

### Issue 1 — Find's landing does not match the prototype

**Covers N3, N4 and N8.** All three are the same forty lines of
`app/(tabs)/find.tsx`, so they are one issue and one pass. Splitting them means
three PRs conflicting inside the same function.

#### Title

```
Find landing: commitment card missing, directory and invite inverted, no tap caption or divider
```

#### Body

```
`app/(tabs)/find.tsx` renders the no-partner landing in a different order from
the prototype, with different controls, and three elements missing.

**The prototype** — `docs/prototypes/src/app_b.js:784` is the return that
composes the screen, and `:773-775` is the `mid` block:

    `<div class="p-h1">Find</div><div class="p-sub">${sub}</div>${comm}${mid}${dirLink}`

In order, top to bottom:

1. `p-h1` "Find"
2. `p-sub` one line of copy
3. **`comm`** — the commitment card (`.ccard2`), ABOVE the radar
4. the radar button
5. **`.tap`** — "Tap to find a match"
6. **`.orl`** — an "or" divider
7. **`.btn-o row`** — "Invite someone you know", a full-width outline button
   with the `together` icon
8. `.link` — "Have an invite code?", small
9. **`dirLink`** — "Already on the move", a `.dlink` row, at the BOTTOM

**What the app does now** (`find.tsx:246-262` for the landing, `:180-208` for
`Doors`):

- no commitment card at all; instead a bare activity name in a `radarName`
  AppText, and BELOW the radar rather than above it
- no "Tap to find a match" caption
- no "or" divider
- "Already on the move" is the full-width outline `Button`, at the TOP of
  `Doors`
- "Invite someone you know" is a plain `AppText` link below it

So items 3, 5 and 6 are missing, and items 7 and 9 are swapped in both position
and control type. The prototype makes the invite the primary alternative to
searching and the directory a quiet row at the bottom; the app has that exactly
inverted.

**What to change**

1. **The commitment card.** `components/challenges/CommitmentCard.tsx` already
   exists and is live on Challenges. The prototype's own comment at
   `app_b.js:777-778` says it is "the same card and the same rule as on
   Challenges" — so this is a reuse with a lock prop, not a new component.

   Place it above the radar. Activity only: no amount, no cadence. It is
   tappable (routes to change the activity) while `pstate === 'solo'` and a
   plain `View` once a search starts. Sub-copy per `app_b.js:779`:

   - unlocked: `You can change this until you start searching for a match`
   - locked:   `Locked while you're looking for a match`

   Geometry, `docs/prototypes/src/app_a.html:283-285`: row, gap 13, `--card`
   background, radius 18, padding 14/16, `--shadow-soft`, margin-bottom 16. The
   icon sits in a 42x42 tile, radius 12, filled with the warm gradient, with a
   22x22 white glyph.

2. **"Tap to find a match"** under the radar.
   `docs/prototypes/choner-find-flow.html:184` — centred, colour `--g2`
   (`#FD5B01`), 11.5px, weight 600, margin-top 2.

3. **The "or" divider.** `app_a.html:259-260` — a flex row, gap 10,
   `--pmuted`, 12px, margin `14px 0 10px`, with a 1px `--pline` rule filling
   the space either side of the word.

4. **Swap the two controls.** "Invite someone you know" becomes the full-width
   outline button with the `together` icon. "Already on the move" becomes a
   `.dlink` row at the bottom: `app_a.html:300-302` — full width, `--card`
   background, 1px `--pline` border, radius 16, padding 14/16, margin-top 16,
   13.5px weight 500, `--shadow-soft`, with an 18x18 `--g2` community icon on
   the left, the label filling the middle, and a chevron on the right.

   Keep "Have an invite code?" as the small link it already is.

Applies to all three `Doors` call sites. On the no-challenge branch
(`invite={false}`) there is no invite button, so the directory row is the only
door — that is correct and should stay.
```

---

### Issue 2 — Headings are 28px; the prototype is 24

**N6.**

#### Title

```
AppText variant="title" is 28px, prototype .p-h1 is 24px
```

#### Body

```
`components/ui/AppText.tsx:18-21` sets `title` to `fontSize: 28`.

The prototype's `.p-h1` — the page heading on every screen — is 24px:
`docs/prototypes/choner-find-flow.html:117`

    .p-h1{font-size:24px;font-weight:300;letter-spacing:-.5px;line-height:1.28;}

`title` already matches on the other three properties: `theme.fonts.display` is
the 300 weight and `letterSpacing: -0.5` is right. Only the size is off, by 4px.

43 screens use `variant="title"` and only 3 override the size, so changing the
one number fixes the app and leaves those 3 alone. Worth checking those 3
afterwards in case they were added to compensate for the 28.

Also set `lineHeight: 31` (24 x 1.28) if it is not inherited — the current line
height may have been tuned against the 28.
```

---

### Issue 3 — Intro sub-line is 14.5px; the prototype is 13

**N7.**

#### Title

```
Intro sub-line is 14.5px/22, prototype .hp is 13px/20
```

#### Body

```
`app/onboarding/index.tsx:100` and `:104` both set `fontSize: 14.5` with
`lineHeight: 22`, on `sub` and `subStrong`.

The prototype's intro sub-line is `.hp`. `docs/prototypes/src/app_a.html:41`
gives the size, and `:334-335` the intro's colour overrides:

    .head-c .hp{font-size:13px;color:var(--pmuted);line-height:1.55;}
    #phone[data-cur="ob-intro"] .hp{color:rgba(255,255,255,.72);}
    #phone[data-cur="ob-intro"] .hp b{color:#fff;font-weight:500;}

So: **13px, line-height 1.55 → 20**.

The colours are already correct — `rgba(255,255,255,0.72)` on `sub` and
`#FFFFFF` with `bodyMedium` on `subStrong` match the prototype exactly. This is
the two sizes and the two line heights only:

    fontSize: 14.5 → 13
    lineHeight: 22 → 20

Both declarations, so the emphasised run stays on the same baseline as the text
around it.
```

---

## 1B. On GitHub, cannot be confirmed from source

**#101, #103, #109** — console and uncaught errors.

Nothing in any of the eleven commits since 2 October addresses these, and they
cannot be reproduced by reading code. They need a device with the console open,
or the error text pasted in.

**#101 and #109 are both "already on the move", so they are probably one bug.**
`app/find/who-else.tsx` reads correctly: it handles `isLoading`, `isError` with
a retry, and an empty list. So the likely cause is underneath it — the
`get_active_directory` RPC throwing, which `features/directory/api.ts:21`
re-raises. See **2C**.

**What is needed:** run the app, open the console, tap into the directory, and
paste the error. Two minutes with a device beats any amount of source reading.

## 1C. Housekeeping — the board is out of date

**All 25 issues (#92–#116) are still open. 21 of them are fixed in code.**

Verified fixed by reading `origin/main`:

| | |
|---|---|
| #92–95 | Legal copy — no AI-coach, subscription or cookie text anywhere in `app/legal/` |
| #97 | Intro logo is `require('../../assets/choner-logo.png')` |
| #98 | `button.tsx:85` routes `primary` through the LinearGradient; the flat `primary` style is deleted |
| #99 | Own centred badge style in `reveal.tsx`; comment names #99 |
| #100 | `partner.tsx:54` — `if (choice === 'invite') router.push('/group/invite')` |
| #102 | `AppTopBar.tsx` — `position: 'absolute'`, `zIndex: 10`, geometry from `.topbar` |
| #104 | `CustomTabBar` draws the SVG `Icon`, not an icon font |
| #105 | Searchable single-area picker, capped at 6 results; comment names #105 |
| #106 | `form.tsx:118` — `pace: null` |
| #107 | `bf614af` removed the fallback, `StartingPointOverlay.tsx`, 2 API fns, 2 hooks — 399 lines |
| #108 | "Searching" throughout; no "Show me here too" switch |
| #110 | Share-first invite via `shareInviteLink`, email secondary |
| #111, #116 | Profile and Community rebuilt in `422ee89` |
| #112 | Home heart, hero, Pulse, Just Happened |
| #113 | Fixed with N2 — the heart is now a real SVG, not an enlarged glyph |
| #114, #115 | Brand-mark loader; only 2 `ActivityIndicator`s left, both deliberate |

Also fixed in passing: the orange glow on `profile.tsx` is gone, and the one in
`find/form.tsx:467` is now tamed to 0.25 opacity / 16 radius on a selected pill.

**Test these and close them.** Twenty-one open-but-done issues is worse than
none: neither person can see what is actually left from the board.

The four genuinely outstanding: **#96** (backend, see 2A) and **#101 / #103 /
#109** (above).

## 1D. N1 — withdrawn, does not reproduce

The audit reported an orange glow on every card, from `components/ui/Card.tsx`
lines 95 and 103 spreading `theme.shadow.glow`. **That was wrong, and wrong
twice over.**

**Those two lines are dead.** They belong to `variant="glow"` and
`variant="gradient"`. Eight files import `Card`, and not one passes either
variant — every `<Card>` in the app renders `styles.base`. The eight
`variant="gradient"` hits in the codebase are all on `<Button>`, not `<Card>`.

**And `styles.base` was already correct.** It spreads `theme.shadow.md`:

    shadowColor: '#1C2B33', shadowOpacity: 0.07, shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 }

which is the prototype's `--shadow-card` exactly
(`choner-find-flow.html:12` — `0 8px 24px rgba(28,43,51,.07)`).
`theme.shadow.sm` is likewise `--shadow-soft` to the digit. The tokens were
right from the start.

The four remaining `theme.shadow.glow` sites are all legitimate — each sits on
an orange object, where the prototype glows too:

| | |
|---|---|
| `components/ui/button.tsx:129` | the gradient button — this IS `--shadow-btn` |
| `app/(auth)/verified.tsx:71` | a 76pt orange disc |
| `components/ui/StateViews.tsx:229` | an 88pt orange illustration disc |
| `app/modals/premium.tsx:260` | the orange premium hero |

**Nothing to do.** The "glow around some buttons" in the 2 October screenshots
was most likely the gradient buttons glowing correctly, which is what the
prototype asks for.

---
---

# PART 2 — BACKEND

## 2A. #96 — email verification

**The only GitHub issue with no code behind it.** But it is probably not a code
task.

`app/(auth)/verify-email.tsx` already exists and is complete: it shows the
address, explains the link, and has a working "Resend email" button wired to
`resendVerification` in `features/auth/api.ts`.

So if verification emails are not arriving, the cause is almost certainly
**Supabase's SMTP configuration, not the app.** Supabase's built-in sender is
rate-limited to a handful of messages an hour and frequently lands in spam —
it is explicitly not for production.

**What to do:** configure a real SMTP provider in the Supabase dashboard
(Auth → Email). Resend or Postmark, free tier is plenty, with **SPF, DKIM and
DMARC records on `choner.io`**. Without those records the mail will be filtered
whatever provider sends it.

This is a dashboard-and-DNS task, maybe an hour, and it unblocks every account
on the platform. It is also the same provider the pre-launch web app will need,
so doing it once covers both.

**Confirm before building anything:** send a test signup and check whether the
mail arrives at all, arrives in spam, or is rate-limited. The three have
different fixes.

## 2B. The tone contract migration — ready, but must be run deliberately

`supabase/migrations/202609291110_profiles_tone_column_contract.sql` drops
`profiles.accountability_mode`. **It is on `main` and it does nothing**, because
it refuses to run without an explicit opt-in:

```sql
set choner.allow_tone_contract = 'on';
-- then run the file
```

That gate exists because `supabase db push` runs every file in the directory,
and without it a routine push would drop the column out from under a running
app.

**Its three prerequisites are now met:**

1. ✅ fe10 is merged — `onboarding/energy.tsx:44` and `profile/edit.tsx:99`
   both write `accountability_style`.
2. ✅ The live reader is re-issued — `202609301700` rewrote `get_match_pool()`
   to read `p.accountability_style`. Its own comment makes the useful
   correction: the handover named four RPCs, but each redefined the last, so
   only one body was ever live.
3. ⬜ The row check (`accountability_mode is distinct from accountability_style`
   returns 0) is run by the file itself.

**So it is ready.** Run it when convenient, on purpose, and let its `pg_proc`
scan confirm nothing else still reads the old name — that scan is the real
safety check, not the row comparison.

**Not urgent.** The expand trigger keeps both names in step, so nothing is
broken while this waits. It is tidying, not a blocker.

Note: `user_challenges.accountability_mode` is a **different column**
(`solo` | `partner`) and is not touched.

## 2C. #101 / #109 — likely `get_active_directory`

Covered in 1B from the frontend side. The backend half: the RPC is defined in
`202609231500_who_else_directory.sql` and amended by
`202610011100_directory_shows_everyone.sql`, which dropped the five-row floor.

If the error turns out to be this RPC, that second migration is the first place
to look — `visible` is now always true and `me_listed` carries the opt-out, so
a payload-shape mismatch against what `features/directory/api.ts` expects would
surface exactly as an uncaught error on that screen.

**Blocked on the error text.** Do not refactor on a hunch.

## 2D. Unverified — matching preferences after an age or gender change

`docs/WORK_GAYAN_BACKEND.md` task 5 ends with: *"changing age or gender should
re-run matching preferences on the next search."*

The profile side is done — `profile/edit.tsx:99-103` round-trips all five
answers (`primary_goal`, `accountability_style`, `main_struggle`, `age_range`,
`gender`), which was the urgent half, since Dinesh removed the "Skip for now"
buttons in the same cycle.

**Whether the re-run happens is unconfirmed.** It needs a look at whether the
match-pool row is invalidated when those two columns change. Small, but it
affects match quality silently if missing — the worst kind of bug.

## 2E. Already done — do not rebuild

Listed so nobody spends a day on something that shipped. All present on
`origin/main`:

| | |
|---|---|
| Weekly commitment model | `app/(tabs)/challenges.tsx` rebuilt 2 October; the daily model is gone |
| Streak | `202610020920_streak.sql` |
| Partnerships + one-per-person | `202609301000`, `202609301500`, `202610012400` |
| End match, six reasons | `202609301400_end_match.sql` — `something_felt_off` is a door, not an outcome |
| Sessions for every activity | `202610021000` |
| Session proposals with cadence | `202610020930` |
| Session details | `202610040900` |
| Challenge history | `202610021020` |
| Home Pulse | `202610030910` |
| Session reminders replacing daily | `202610030920` |
| Activity locked once searching | `202610021030` |
| `days_per_week` 1–7 | `202609301100` — the old `in (3,4,5,7)` bug that rejected 1x and 2x is fixed |
| Invite email optional | `202610031100` |

---
---

# PART 3 — Order of work

Nothing in Part 1 depends on anything in Part 2, so these can run in parallel.

**Do first, because it changes what everything else means:**

1. **Test the app and close the 21 done issues** (1C). Half an hour. Until this
   happens the board is misinformation.
2. **Reproduce #101 / #103 / #109** (1B) and paste the errors. Two minutes with
   a device, and it decides whether they are frontend or backend.

**Then, frontend:**

3. **Issue 2** (N6, heading size) — one number.
4. **Issue 3** (N7, intro sub) — two numbers.
5. **Issue 1** (N3/N4/N8, Find landing) — the real piece of work, perhaps half
   a day, and mostly reuse since `CommitmentCard` exists.

**Then, backend:**

6. **#96 SMTP + DNS** (2A) — an hour, unblocks every account, and the same
   provider the pre-launch web app needs.
7. **2D** — confirm the age/gender re-run.
8. **2B** — run the tone contract when convenient. Not a blocker.

**Not started, offered previously:**

- Component test harness. Ten tests exist and all ten test pure functions;
  `jest-expo` and `@testing-library/react-native` are not installed, so not one
  test renders a component.
- The Home-states and standalone Find/Challenges prototypes are both stale
  against the current model.
