# Choner — prototype handover and rebuild guide

Written 2026-09-28. This is the recovery document: everything needed to rebuild the four
interactive prototypes and to carry the product decisions into the app, assuming the machine
they were made on is gone.

---

## 1. Read this first — what is fragile

| Thing | Where it lives | Survives a dead laptop? |
|---|---|---|
| The four published prototypes | claude.ai (links below) | **Yes** — tied to the Anthropic account, not the machine |
| Prototype sources + build scripts | `docs/prototypes/src/` (this repo) | **Yes, once committed and pushed** |
| `docs/DECISIONS_LOG.md` | this repo, now **committed** | **Yes** |
| Built prototype HTML | generated, **gitignored** | rebuilt in one command, see §3 |

`docs/DECISIONS_LOG.md` was gitignored until 29 September, which meant the full dated record of
every decision and every rejected alternative existed on one laptop only. It is committed now.
This document summarises the conclusions but is not a substitute for the reasoning in the log.

---

## 2. The four prototypes

All four are interactive single-file HTML pages. Every button works; there is no backend.

| Prototype | Published link | What it covers |
|---|---|---|
| **Splash to Home** | https://claude.ai/artifact/4Sk5AwVK4f4BouSWks8gon | The whole first-run app: splash, auth, invite codes, all onboarding steps, the partner choice, Home and the four tabs |
| **Home states** | https://claude.ai/artifact/CjFJ8NDqEAQaND14Ej99W2 | Every Home state by preset: no challenge, no partner, finding, invited, matched, planned, the day, missed, done, complete, ended |
| **Challenges tab** | https://claude.ai/artifact/6ZrGVeuv7gRSoP2tmWkRav | The full day-of flow, misses, repair, move, cancel, end |
| **Find & Challenges** | https://claude.ai/artifact/YLKUahXoetAvC6JK2Kzw7M | The original Find flow. The only one shared "Anyone with the link" |

The first three are **private to the account that made them**. Gayan cannot open them until they
are shared from each page's Share menu.

The built HTML is **not committed** — it is generated, and would churn on every republish. Build it
once (§3) and open the file in a browser; no server needed.

---

## 3. Rebuilding the prototypes

### Requirements

Python 3 only. No packages, no node, no network.

### Layout

```
docs/prototypes/
├── choner-find-flow.html         <- COMMITTED. A source: no script builds it
└── src/
    │   (the three build scripts write their output into whatever directory you
    │    run them from, so building here leaves choner-app-flow.html,
    │    choner-home-states.html and choner-challenges-tab.html in src/.
    │    All three are gitignored in either location.)
    ├── build_app.py       hs_build.py       ch_build.py
    ├── app_a.html         (CSS for the app flow)
    ├── app_b.js           (all screens + logic for the app flow — the big one, 116 KB)
    ├── hs_main.js         hs_css.css  hs_css2.css  hs_css3.css   (Home states)
    ├── ch_main.js         ch_css.css                             (Challenges tab)
    └── find-flow.bak.html (shared base: CSS + the icon set — DO NOT DELETE)
```

### Build

```bash
cd docs/prototypes/src && python build_app.py && python hs_build.py && python ch_build.py
```

Each prints the byte count of what it wrote. `build_app.py` also prints a count of unreplaced
`__PLACEHOLDER__` tokens — **it must be 0**.

Builds are deterministic: running one twice produces a byte-identical file.

### How the build works

Each script concatenates, in order:

1. The `<title>` and the opening `<style>` line
2. **Lines 2–320 of `find-flow.bak.html`** — the shared CSS (phone frame, buttons, cards, rail)
3. `app_a.html` — the CSS added for these prototypes
4. the prototype's own CSS files
5. `</style>` plus an HTML shell (header, rail, controls, phone, notes panel) written inline in the script
6. **Lines 357–395 of `find-flow.bak.html`** — the shared icon set and the `esc()` helper
7. for `hs_build.py` and `ch_build.py` only: the `Object.assign(IC, { ... });` block lifted out of
   `app_b.js` by string index (extra icons added later), so all four share one icon set
8. the prototype's main JS
9. `</script>`

Finally every non-ASCII character is escaped to a `\uXXXX` sequence, so the output is pure ASCII
and safe to publish anywhere.

`build_app.py` additionally inlines `assets/choner-logo.png` as a base64 data URI (replacing the
`__LOGO__` token) and substitutes `__FIND_URL__` with the Find artifact link.

### Traps

- **`find-flow.bak.html` is a build input, not a backup.** All three scripts slice it by fixed line
  numbers. Editing it shifts those slices and breaks every build. The asserts in the scripts catch
  it, but only after the fact.
- `hs_build.py` and `ch_build.py` read `app_b.js` for the icon block. Changing the icons in the app
  flow changes all three prototypes.
- CSS is shared three ways. `app_a.html`, `hs_css.css` and `ch_css.css` are each used by more than
  one build, so a rule added for one prototype lands in the others.

### Prototype architecture (inside `app_b.js`; the same pattern in the other two)

- `S` — one flat state object (current screen, history, partner state, commitment state, form fields)
- `def(id, {ph, group, label, bar, nav, body, note, onEnter})` — registers one screen into `SC`
- `go(id, opts)` and `goBack()` — navigation over a history stack; `{jump:true}` for a tab switch
- `render()` — redraws the phone, the left rail and the right notes panel from `S`
- `act(name, value)` — one switch statement holding every button action
- `ORDER` — the array that drives Back/Next and groups the left rail
- `N(title, summary, bullets, warnings)` — builds the note shown in the right-hand panel. This is
  where the "in the app" notes and the known-bug callouts live, so read these while building.

### Verifying a change

1. `node --check` on the extracted `<script>`, or just load the page and watch the console
2. Open the file in a browser and click through the rail, or drive it from the console:
   `document.querySelector('[data-jump="home"]').click()`
3. Screens render into `#content`; left-rail buttons carry `data-jump`

---

## 4. The product model, as decided

The prototypes implement this. The app does not yet.

- **The unit is a weekly shared commitment**, not a 7-day challenge with daily tasks. "Run 2x a week."
- **The streak counts commitments both partners kept.** Never days.
- Weeks run **Monday to Sunday**, with a scaled first week from the match day.
- **One session is planned at a time.** The next is planned as soon as the current one is done.
- **One active challenge per user.** One repair per week.
- **No solo mode.** Nothing can be logged without a partner.
- Cadence is **1x, 2x or 3x a week**. Agreed once, by both people, at the first plan.
- Two modes per session: **Together** (meet, confirm with a QR code) or **Separately, together**.

### Tab ownership — the rule everything hangs off

> **Home** may open a sheet **about the commitment it is already showing** (Plan a session, View
> session). It may **never** open one that **starts or ends another tab's lifecycle**.

| Tab | Owns |
|---|---|
| **Home** | the current commitment, and only that |
| **Find** | every partner path: search, invite, invite code, stop, switch, cancel |
| **Challenges** | the whole challenge lifecycle: create, end, cancel, history |
| **Community** | the feed |

Tab order is **Home, Find, Challenges, Community**.

Anything Home cannot do itself is a **single tab switch** landing on that tab's own top screen,
never mid-flow. Home's partner-less states therefore carry exactly one button ("Find a partner",
"Go to Challenges", "See your invite", "See your match"), and the searching state carries none —
just a tappable "Searching" row.

### Onboarding — 10 screens

Intro, Goal, Struggle, Style, About you (age and gender), Energy, Reveal, Photo,
Pick a challenge, Partner choice.

- **No skips.** Every answer is required, because matching depends on age and gender and there was
  no way to set them afterwards.
- Onboarding **never does another tab's work**: it does not run a search and does not send an
  invite. The partner choice hands over to the Find tab, where the person taps the radar themselves.
- The photo is **live camera only** and earns a badge labelled **"Photo confirmed"** — never
  "verified", never anything implying identity verification. Choner checks the photo was taken
  live, not who is in it.
- **"Your why" is asked once**, after the first session is agreed, and is **private**. Nobody sees
  anyone else's. Editable from Profile.

### Copy rules

- No long dashes anywhere.
- Line icons only, no emoji.
- The button that makes an account says **"Create an account"** everywhere.
- The legal line sits at the bottom of Sign in and Sign up, never on Welcome.

---

## 5. What Gayan has to build

Each of these came from reading the current code against the decisions.

### Bugs in the app today

1. **Email verification never signs anyone in.** `detectSessionInUrl` is `false` in
   `lib/supabase.ts` and nothing reads the tokens from the link. The account is verified on
   Supabase, but the app drops the person back on "Check your email", not signed in, with Resend
   disabled because the link carries no email. **Fix:** read the tokens from the link and create
   the session, then show a "You're verified" screen. Add `choner://verify-email` and
   `choner://reset-password` to the Supabase allowed redirect URLs.
2. **Reset password has the same bug.** Without a session from the link, Save password fails.
3. **A brand-new invitee ends up with no profile.** `app/invite/[token].tsx` replaces to
   `/onboarding/why` for *everyone*. Someone who signed up two minutes ago reaches Home with no
   goal, struggle, style, age, gender or energy, all of which matching and the app's tone depend
   on. **Fix:** a new account goes to the onboarding intro and builds a profile, skipping only the
   challenge picker and the starting point (they inherit their partner's challenge). An existing
   account goes straight to the why.
4. **Notifications crash on web.** `lib/notifications.ts` guards only against Expo Go, so
   `getLastNotificationResponse` is called on web where it does not exist. Add a
   `Platform.OS === 'web'` check.
5. **Edit profile is missing three fields.** `app/profile/edit.tsx` has name, photo, goal and style
   only. Struggle, age and gender must be added. Without them those answers are set once at
   onboarding and can never be corrected, and that is what makes removing the onboarding skips safe.

### Data and privacy

6. **The reflections ("why") table must stop being partner-readable.** It currently has to be, to
   feed the "Why Gayan is doing this" card on Session Details. That card has been removed and the
   why is now private, so the RLS needs tightening or the answer stays exposed at the data layer.

### Rebuilds

7. **`app/(tabs)/challenges.tsx` needs rebuilding** to the weekly-commitment model. The code today
   is a 7-day challenge with daily task check-ins; the decided product is a rolling weekly shared
   commitment. Every state is in the Challenges prototype.
8. **The invite code should be 6 characters, not 36.** Today it is the raw
   `challenge_invites.token`, a 36-character UUID shown only in the invite email. The prototypes
   use a 6-character code with an activity prefix (`RUN4K7`) shown inside the app.
9. **Invite and search are one at a time.** Starting an invite stops a search and vice versa, with
   a confirm. Nobody ends up with two partners.

---

## 6. Still undecided

Do not resolve these silently.

1. **An invitee who already has an active challenge enters a code.** End theirs, replace it, or
   block it? The recommendation was: ask, then replace; block outright if they are already
   partnered.
2. **Does an unused invite code expire?**
3. **What the matching wait promises.** "Usually a day or two" (resolution doc) versus
   notify-on-match (prototype copy).
4. **Button label convention.** Find's empty state names the goal ("Find a partner"); Challenges'
   names the destination ("Go to Challenges"). Two conventions sitting side by side.
5. **Sign up states the agreement twice** — the tick box and the legal line at the bottom. One
   should go, and the tick box is the one that records consent.
6. **"Photo confirmed" vs "Photo verified".** Locked as "confirmed"
   (`Choner_31_Changes_Full_Detail.md` #2) and deliberately not changed when asked, because Choner
   cannot stand behind an identity claim when two strangers meet in person. Flagged, not overturned.

---

## 7. Starting from scratch on a new machine

```bash
git clone <the repo>
cd choner-reimagined
npm install
cd docs/prototypes/src && python build_app.py && python hs_build.py && python ch_build.py
```

Then open `docs/prototypes/choner-app-flow.html` in a browser.

To republish a prototype to its existing link so the URL keeps working, give Claude the artifact
URL together with the built file and ask it to update *that* artifact. Publishing without the URL
creates a new artifact at a new link instead, and every link already shared goes stale.

The decisions log, if it survived, is `docs/DECISIONS_LOG.md`. Read it before changing anything
about product shape: it is the only record of what was considered and rejected, and why.
