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

### 1. Deploy three Edge Functions — **Dinesh or Gayan**

`DineshDoluweera/fix/edge-function-cors` adds CORS to `delete-account`,
`ai-coach` and `submit-live-photo`. Until these are deployed, **all three stay
broken in the browser**, merged or not. Account deletion is the one Apple and
Google both require.

```
npx supabase login
npx supabase link
npx supabase functions deploy delete-account ai-coach submit-live-photo
```

`supabase/config.toml` has `project_id = "choner-local"`, the local project, so
`link` is not optional. Run it once and pick the hosted project from the list.

Done when: deleting an account from the web build no longer says "Failed to
send a request to the Edge Function".

Why not Claude: the Supabase connector in the session is unauthorised
(`/mcp`), and deploying is a production change regardless.

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

### 4. Test the three open fixes on a device — **Dinesh**

`fix/tab-bar-emit`, `fix/toast-nested-button`, `fix/edge-function-cors`. None
is confirmed on hardware. Everything Claude can check (typecheck, lint, tests,
`deno check`) is already green and none of it would have caught the tab bar
crash.

Why not Claude: it cannot hold a phone.

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
done, say so and Claude can run the builds itself**, including the iOS
development build that has never been made.

### Production database changes

Migrations against the hosted project, `supabase db push`, SQL run on live
data. Claude writes the migration; applying it is a human decision.

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

Supabase (backup retention, which functions are actually deployed, logs),
Sentry, PostHog, EAS Observe. Note that **Sentry and PostHog are both switched
off anyway**: `EXPO_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_POSTHOG_KEY` are empty
strings, so `initObservability()` does nothing and no crash has ever been
recorded. Filling either in would have shortened the freeze hunt
considerably, though Sentry's native module is not in Expo Go, so it only
starts reporting properly from a development build.

---

## How Claude flags these from now on

- A blocker goes in its own section, headed **BLOCKED ON YOU**, never in a
  closing sentence.
- It names who: Dinesh or Gayan.
- It says what breaks if the step is skipped, not just what the step is.
- It says how you know it worked.
- It gets added here in the same turn it is found.
