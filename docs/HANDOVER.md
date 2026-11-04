# Handover — Choner, 4 November 2026

Written to be handed to a **fresh Claude Code session on Gayan's own account**,
starting cold in this repository with none of the preceding conversation.

There is **no `CLAUDE.md` in this repo**, so a new session gets no project
context automatically. Point it at this file in the first message:

> Read `docs/HANDOVER.md`, then tell me what you think the next step is.

Everything below was checked against the repository, EAS, Supabase and the live
site on 3–4 November 2026. Where something could not be checked, it says so
under [What this file does not know](#what-this-file-does-not-know) instead of
being guessed at. Dates are absolute on purpose: "last week" rots.

---

## 1. Read these, in this order

| File | What it is | Trust |
|---|---|---|
| `docs/DECISIONS_LOG.md` | The real history, append-only. **Read it bottom-up** — the last five entries are the live state. | High. Entries say what was measured vs. assumed. |
| `docs/HANDOVER.md` | This file: launch-ops state. | High, as of 4 Nov 2026. |
| `docs/SHIPPING_CHECKLIST.md` | Launch checklist by area. | **Stale in three named ways — see §7.** |
| `docs/OUTSTANDING_WORK.md` | Product/issue-level gaps, verified against `origin/main` at `7289a37`, 5 October. | Product detail still useful; launch ops superseded by this file. |
| `docs/ARCHITECTURE.md`, `docs/CHONER_MASTER_SPEC.md` | How the app is built and what it is for. | Background, not launch state. |

---

## 2. Where the code stands

- **Branch:** `main` at `fa279f8` (merge of #162). Nothing of substance is
  uncommitted — `git status` shows only `.claude/settings.local.json`,
  `supabase/.temp/cli-latest` and the untracked `_bmad-output/` planning folder.
- **Expo SDK 58**, React Native via Expo Router. Builds clean on EAS.
- **Feature gates** (`constants/features.ts`): `pro` and `aiCoach` both default
  **off**. Each can be flipped per build with `EXPO_PUBLIC_FEATURE_PRO` /
  `EXPO_PUBLIC_FEATURE_AI_COACH` — no code change needed. They are hidden, not
  deleted, so nothing about them should be "finished" before launch.
- **Tests:** `npx jest` — the auth suites alone are 53 tests across 5 files.
  CI (`.github/workflows/ci.yml`) runs lint + typecheck on every PR.

### The current build

```
Build    549ea196-48c7-44fd-b3df-107b9deba029
Profile  preview (internal APK)     Android, SDK 58
Version  0.2.0 (versionCode 3)      Commit fa279f8
APK      https://expo.dev/artifacts/eas/AXq92EtvaKSuXG4uiDzmUn0sTbO19fGKS7261Gfy5_Y.apk
Started 3 Nov 00:49 · finished 3 Nov 04:50 (≈4h, almost all of it queue)
```

It is the first build that carries **both** the private-avatars change and the
resend-redirect fix. Anything installed before it shows blank avatars and sends
resent confirmation links to the website.

A `preview` build does **not** auto-increment: `eas.json` sets
`appVersionSource: remote` and only the `production` profile has
`autoIncrement`. So preview builds take the current remote counter as-is, which
is why this one shares versionCode 3 with the 29 October production build. It
still installs over the older preview APK (2). Harmless for sideloading; do not
hand a `preview` APK to Play.

---

## 3. The launch route changed: iOS first, Android second

This reverses the plan most of the older docs were written under, so it is the
single most important thing to carry over.

**Apple Developer Program was paid on 27 October 2026** — US$98.99/year,
**Individual** (Organization needs a D-U-N-S number and weeks). It
**auto-renews 27 October 2027** and must be cancelled at least a day ahead to
avoid the charge.

Apple became the faster route the moment Play's testing gate appeared:

- **Play** (personal developer account) requires a **closed test with ≥12
  testers opted in for 14 continuous days** before production access can even be
  requested. That clock is the long pole — nothing shortens it.
- **TestFlight** requires none of that, and App Store review is usually a day
  or two.

Realistic shape: **iOS inside a fortnight, Android late November.**

**But iOS has never been built.** There are zero iOS builds in EAS history, and
`eas.json`'s `submit.production.ios` still holds `REPLACE_WITH_APPLE_ID`,
`REPLACE_WITH_ASC_APP_ID` and `REPLACE_WITH_APPLE_TEAM_ID`. The first iOS build
is genuinely step one, not a formality.

### The two bundle identifiers are deliberately different

| | |
|---|---|
| iOS | `com.choner.app` |
| Android | `io.choner.app` |

`com.choner.app` is registered to a **separate** Android developer console
account, so the Choner.io Play account cannot prove ownership and Play refuses
to create the app under it. There is no self-service transfer, so the Android
package moved instead (`8bb0761`, 28 October). Apple has no such conflict, so
the iOS identifier was left alone.

`google-services.json` now carries **both** package names, which is why Android
builds stopped failing with "No matching client found for package name". Do not
"tidy" the old one out.

---

## 4. What is done, and the proof

Each of these was measured, not inferred. The proof is included so the next
session can re-run it rather than trust this file.

### Email verification comes back to the app

`/auth/v1/verify` validates `redirect_to` **before** it reads the token, so a
deliberately invalid token reveals the allow-list decision in the `Location`
header. Allow-listed is echoed back; rejected is replaced by Site URL.

```bash
probe() { curl -s -o /dev/null -D - \
  "https://bkncpybneoqjnkhhchxg.supabase.co/auth/v1/verify?token=deadbeef&type=signup&redirect_to=$1" \
  | grep -i '^location'; }

probe "choner%3A%2F%2F%2Fverify-email"          # -> choner:///verify-email      ✅
probe "https%3A%2F%2Fchoner.io%2Fverify-email"  # -> https://choner.io/verify-email ✅
probe "https%3A%2F%2Fnot-allowed-xyz.com%2Fx"   # -> https://choner.io           ← rejected
```

The third line is the control. Without it an echo proves nothing, because every
answer would look like a pass.

Two things to hold onto:

1. **The browser always opens first.** The token is checked server-side, so the
   address is confirmed at that moment and the app is only where the 303 lands.
   No setting skips the hop. Skipping it needs a `{{ .TokenHash }}` email
   template pointing at a link the OS hands straight to the app — the parked
   `app.choner.io` work. `parseAuthLink()` in `features/auth/link.ts` already
   handles that shape, so it is a domain and a template away, not an app rewrite.
2. **A signup made on choner.io is supposed to come back to choner.io.** See
   §8 — this is the trap that made the bug look unfixed for three weeks.

### Account deletion reaches storage, not just rows

`supabase/functions/delete-account/index.ts` (deployed, v3) removes the user's
objects from `avatars` and `checkin-photos` **first**, then calls
`delete_account()` as the user. Storage-first is deliberate: the path prefix is
the user id, so deleting the account first would orphan files nobody could
identify. `features/profile/api.ts` invokes the function with **no RPC
fallback**, on purpose — a fallback would silently skip the files.

`delete_account()` (`202610291200`) also reaches what no foreign key reaches:
invites addressed to the leaving user's email, and their
`prelaunch_registrations` row (nulling other people's `referred_by` first, which
is the FK that failed the first manual attempt).

**The honest limit:** `avatars` is private and read through signed URLs, so the
CDN can still serve a copy somebody already loaded for up to one signature's
life — `TTL_SECONDS` in `lib/avatars.ts`, ten minutes. Measured 2 November:
`cf-cache-status` went MISS then HIT twice, with no `cache-control` header. The
window is **bounded, not closed**. That wording matters because it ends up in a
privacy policy and a Data safety answer. Shortening `TTL_SECONDS` shrinks it.

### Avatars are not world-readable

`202610291400` made the bucket private, replaced the open read policy with one
scoped to `authenticated`, and rewrote `profiles.avatar_url` from URLs to
storage paths. `lib/avatars.ts` signs on read, batching one signing call per
tick and caching by path — which matters because 1,470 sample profiles share
100 files.

Check it still holds:

```bash
# a bare public URL for an avatar must now fail
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://bkncpybneoqjnkhhchxg.supabase.co/storage/v1/object/public/avatars/<path>"   # 400
```

### The account-deletion page Google Play asks for is live

`https://choner.io/delete-account/` returns 200 and covers both routes (in-app,
and email for people who have uninstalled), what is removed, and what is kept
and why. `web/legal/privacy.html` links to it. It was built **outside this
repository**, so it is not in `web/` — do not conclude it is missing.

`https://choner.io/privacy.html` and `/terms.html` are also live. Neither has
been legally reviewed against PDPA.

---

## 5. What is open, in the order it matters

### 5.1 Confirm the Play Console state before doing anything Android

This file **cannot see the Play Console**. Check, in this order:

1. Is the app created under **`io.choner.app`**? (The rename was forced; if the
   app was created earlier it may still be the old package.)
2. Is the identity verification finished, and the contact phone number verified?
   Both are account-owner-only actions.
3. Is a **closed test** running, and **when did its 14-day clock start**? That
   date decides the launch date and nothing else does.
4. How many testers have actually **opted in** (not invited — opted in)? The
   bar is 12, continuously.

`android-play-service-account.json` is present locally and gitignored, and
`eas.json`'s `submit.production.android` points at it with `track: internal`,
`releaseStatus: draft`. So submission is wired; whether anything has been
submitted is the open question.

**Do not poll the Play Developer API while a submission is in flight.** It has
cost time here before.

### 5.2 Get the current build to the testers

The APK in §2 is the first one worth testing. It is a sideload link, not a Play
release. Two different things to verify once it is installed:

- **Faces render again** anywhere a profile appears (Profile, Community, Who
  else) — the signed-URL path working end to end on a device.
- **Verification opens the app:** sign up **inside the app**, tap the link in
  the email, and the browser should hand off to Choner. Then test **resend**
  from "Check your email", which is the path #162 fixed and which no build
  before this one could do.

### 5.3 The Data safety form, worded to what is true

What it may say: account and content deletion is available in-app and by email;
check-in photos are deleted once seen and in all cases within 7 days; data is
not sold.

What it may **not** say: that deletion is instantaneous everywhere (see the CDN
window in §4), or that analytics are collected — **Sentry and PostHog are wired
but inert**. No DSN or key appears in `.env` or in any `eas.json` profile, and
the 3 November build logged "No environment variables … found for the `preview`
environment on EAS". Confirm the same for `production` before answering the
form; claiming collection that does not happen is as wrong as the reverse.

### 5.4 iOS, from zero

First build, then an App Store Connect app record, then fill the three
`REPLACE_WITH_*` fields in `eas.json`. `usesAppleSignIn` is deliberately
`false` — see §8.

### 5.5 Store graphics and listing copy

Unknown state, and historically Dinesh's. Icon, feature graphic, screenshots,
descriptions, content rating, target audience.

### 5.6 Runtime QA that has never been done

- **SDK 58 on a device.** It builds clean and has never been exercised at
  runtime beyond the smoke level.
- **Two-account flows** end to end: invite → accept → partnership → check-in →
  photo proof → honor tap. These involve RLS and security-definer RPCs and have
  only ever been tested in pieces.

---

## 6. Access the next session will need

| Thing | Where | Note |
|---|---|---|
| Supabase project | ref `bkncpybneoqjnkhhchxg` | An MCP server is connected in this workspace for SQL, migrations, edge functions and logs. The **dashboard** (auth URL config, email templates, SMTP) needs a browser sign-in. |
| EAS / Expo | account `gayan.s`, orgs `choner` and `choner-io`; project `choner-mobile` | `npx eas-cli whoami` to check. |
| Google Play Console | personal account "Choner.io" | Browser. Account-owner-only steps exist. |
| Apple Developer / ASC | Individual, paid 27 Oct 2026 | Browser. |
| Resend | sends all auth + transactional email | `list-emails` shows sent mail **with its HTML**, which is how the live confirmation link was inspected without an inbox. There is no Resend inbox on the account. |
| Firebase | project `choner-6d275` | FCM for push; holds both Android packages. |

Secrets live in `.env` (gitignored) and in the EAS/Supabase dashboards. Nothing
in this file is a secret.

---

## 7. Where the older docs are wrong

`docs/SHIPPING_CHECKLIST.md` is still useful as a map, but three lines are now
false:

1. "Create Supabase Storage bucket `avatars` (**public read**)" — it is
   **private** as of `202610291400`, deliberately, and reads go through signed
   URLs. Making it public again would undo the deletion fix.
2. "Once verified: Create app → **`com.choner.app`**" — Android is
   **`io.choner.app`**. That is the whole point of `8bb0761`.
3. The ordering assumes **Android first**. It is iOS first now (§3).

`docs/OUTSTANDING_WORK.md` is honest but was verified on **5 October** against a
commit that is now a month behind. Treat its launch-ops content as history and
its product findings as a to-check list, not a to-do list.

---

## 8. Traps that have already cost time

- **The web build and the app share a codebase and do not share a redirect.**
  On web, `Linking.createURL()` resolves to `https://choner.io/...`; in an
  installed build it resolves to `choner:///...`. A signup made on choner.io
  therefore comes back to the website, correctly. The verification bug looked
  unfixed for three weeks partly because it was tested from the web app. The
  `/signup` request's `referer` header tells you which client it was — React
  Native sends none.
- **It cannot be reproduced in Expo Go either.** There the generated URL is
  `exp://…`, handled differently, so the flow looks right every time.
- **A catalog sweep by column type will lie to you.** Looking for an email
  across the schema missed `prelaunch_registrations.email` (it is `citext`) and
  nine `text[]` columns. Any such sweep needs to count the columns it could
  **not** read, or a silent zero is indistinguishable from a real one.
- **`getSession()` never contacts the server.** A deleted user's JWT stays
  locally valid; the server answers 403 `user_not_found`. Auto sign-out is
  triggered only on 401/403/404, deliberately.
- **A security-definer RPC that answers "may I see X?" is an oracle.**
  `blocked_between()` is revoked from every client role for exactly that
  reason: the blocked person is never told. Blocking belongs inside the
  functions that hand out data, never in a storage policy.
- **`usesAppleSignIn` is `false` on purpose.** The feature is two-thirds built
  and unreachable (`SocialButton` is rendered nowhere;
  `expo-apple-authentication` is not a dependency). Asking Apple for a
  capability the app cannot use is a question a reviewer can ask, and a question
  costs a review cycle. Related: Apple's Hide My Email breaks the automatic
  First 200 claim, which matches a signup address against a registered one — so
  social sign-in is v1.1, not v1.
- **Never poll the Play Developer API mid-submission.**
- **React Native Web:** `flex: 0` and long animation durations behave
  differently than on native; both have produced phantom layout bugs.

---

## What this file does not know

Stated plainly so none of it gets assumed:

- **Any Play Console state** — whether the app record exists, under which
  package, whether identity and phone verification completed, whether a closed
  test is running, when its 14-day clock started, or how many testers have
  opted in.
- **Whether the 3 November APK has been installed by anyone**, and therefore
  whether private avatars and the two verification paths work on a real device.
  Nothing in §4 was verified on a phone; it was verified against the server.
- **Store graphics and listing copy** — existence and state unknown.
- **Whether the legal pages have had a PDPA review.** Assume not.
- **iOS beyond "enrolled and never built."** No ASC app record was confirmed.

---

**Written by:** Claude, 4 November 2026, from the session that merged #162 and
cut build `549ea196`.
