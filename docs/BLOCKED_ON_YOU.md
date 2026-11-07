# Blocked on a human

Things Claude **cannot** do, and that therefore sit still until Dinesh or
Gayan does them. If a fix is listed here, the code being written and merged
changes nothing on anyone's phone until the step below it is done.

Kept here because it kept getting lost at the bottom of a long message. Claude
adds to this file whenever it hits a wall, and says so in the same breath
rather than mentioning it in passing.

Last updated 2026-11-06.

---

## Open right now

### 1. `npm install`, on both computers — **Dinesh**

`react-native-purchases` is pinned to exactly `10.16.0` as of #178, after
`11.0.1` turned out to have no published iOS pod. A checkout that has not
installed since then is running a different RevenueCat from the one the repo
declares and the build servers use.

```
npm install
```

Both `E:\choner-reimagined` and `C:\Users\dines\choner-reimagined`. Run it
when no Claude session is working in that folder.

Done when: `node_modules/react-native-purchases/package.json` says `10.16.0`.

Why not Claude: it can reach only the machine it runs on, and installing while
another session is mid-edit in the same folder is how a checkout gets broken.

### 2. Fix `.env` on the other computer — **Dinesh**

The `.env` at `C:\Users\dines\choner-reimagined` was never checked. The one on
the main machine held **`.env.example` copied whole, with the real values
appended at the bottom**, so `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` each appeared twice: a placeholder first, the
real value second. dotenv takes the last, so it worked by luck. Reorder that
file and the app silently points at nothing.

Done when: each key appears exactly once, with the real value.

Why not Claude: it can only edit files on the machine it is running on.

### 3. Rotate three Supabase credentials — **Dinesh**

Pasted into a chat on 14 October and never rotated: the **publishable key**,
the **secret key** (which bypasses every RLS policy), and an **`sbp_` personal
access token**. The secret key is the urgent one.

Supabase dashboard → Project Settings → API, and Account → Access Tokens.

Why not Claude: they are account credentials, and it will not handle them.

### 4. Test the merged fixes on a device — **Dinesh**

`fix/tab-bar-emit`, `fix/toast-nested-button`, `fix/edge-function-cors` and
`fix/verify-email-exit-160` are all on `main`. **None is confirmed on
hardware.** Everything Claude can check (typecheck, lint, 38 jest suites,
`deno check`, and a live preflight against the deployed functions) is green,
and none of it would have caught the tab bar crash that started all of this.

Why not Claude: it cannot hold a phone.

---

## Done, kept so the next person does not redo it

### Deploying the three Edge Functions — two of three, 6 November

`delete-account` (now version 4) and `submit-live-photo` (version 2) were
deployed from `main` through the Supabase connector in the session. Verified
from outside afterwards: the `OPTIONS` preflight answers **200 with the
function's own CORS headers**, and an unauthorised `POST` comes back as a
plain 401 that still carries them, so the browser sees the real reason rather
than an opaque CORS failure.

Worth recording, because it was the risk that could have made the whole fix
pointless: `invite-email` has `verify_jwt = true` and answers a preflight at
200. **JWT verification does not block the preflight on this project.** The
documented trap, where the gateway 401s an `OPTIONS` request that by
definition carries no `Authorization` header, does not apply here.

The third, `ai-coach`, was never deployed and never will be: there is no AI
coach in Choner. Its 404 is what surfaced that the code existed at all, and
the whole feature was removed on 2026-11-07 instead. No `OPENAI_API_KEY` is
needed by anything.

---

## Always, by their nature

These recur. Nothing here is a one-off.

### Anything on a device

Running the app, tapping through it, reading a freeze, confirming a fix.
Claude can write instrumentation and read logs that are pasted back, which is
how the iOS freeze was found, but it never sees the screen.

### EAS builds — **one step from Dinesh, then Claude can run them**

```
npx eas-cli login
```

Needs an Expo account password, which Claude will not type. **Once that is
done, say so and Claude can run the builds itself.** For the record: Gayan ran
this project's first iOS builds on 6 November from his own machine. Both died
in the RevenueCat pod (#177, then #178), and the dependency is now pinned to
an exact `10.16.0` because `11.0.1` has no published iOS pod.

### Production database changes

Migrations against the hosted project, `supabase db push`, SQL run on live
data. Claude writes the migration; applying it is a human decision.

Note that the Supabase connector in the session **is** authorised, so Claude
can reach the hosted project directly. That makes this a question of who
approves a change to production, not of what Claude is able to do. It asks
first, every time, and says exactly what would change.

### The two store consoles — **Dinesh**

App Store Connect and Google Play Console. Identity verification, phone
verification, the 12-tester / 14-day closed test, the refund request on the
16 October $25 charge, submissions, review replies. All behind his accounts.

### Merging, and opening PRs

Claude pushes branches and hands over the compare link. It does not open a PR
without being asked, and never pushes to `main`. Merging is always Dinesh's.

### The live WordPress site

The account-deletion page, including the outstanding `text-align: left` fix.
His login, his site.

### Dashboards Claude cannot reach

Sentry, PostHog, EAS Observe. Supabase is reachable through the session's
connector, so "which functions are actually deployed" is no longer a question
only Dinesh can answer, which is how the `ai-coach` 404 was found at all.

Note that **Sentry and PostHog are both switched off anyway**:
`EXPO_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_POSTHOG_KEY` are empty strings, so
`initObservability()` does nothing and no crash has ever been recorded.
Filling either in would have shortened the freeze hunt considerably, though
Sentry's native module is not in Expo Go, so it only starts reporting properly
from a development build.

---

## How Claude flags these from now on

- A blocker goes in its own section, headed **BLOCKED ON YOU**, never in a
  closing sentence.
- It names who: Dinesh or Gayan.
- It says what breaks if the step is skipped, not just what the step is.
- It says how you know it worked.
- It gets added here in the same turn it is found.
