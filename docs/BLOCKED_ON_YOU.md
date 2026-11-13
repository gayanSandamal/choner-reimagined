# Blocked on a human

Things Claude **cannot** do, and that therefore sit still until Dinesh or
Gayan does them. If a fix is listed here, the code being written and merged
changes nothing on anyone's phone until the step below it is done.

Kept here because it kept getting lost at the bottom of a long message. Claude
adds to this file whenever it hits a wall, and says so in the same breath
rather than mentioning it in passing.

Last updated 2026-11-10.

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

### 5. Make the three Play Store graphics they will not launch without — **Dinesh**

This is the longest pole in the launch that is not simply waiting.

| Slot | Required | State |
|---|---|---|
| App icon, 512 x 512 | yes | **done**, exported from `assets/icon.png` on 7 November |
| Feature graphic, 1024 x 500 | yes | does not exist |
| Phone screenshots, 2 to 8 | yes, minimum 2 | none exist |

Specs and which screens to shoot are in `docs/play-store/ASSETS.md`.

What breaks if it is skipped: Play will not let the closed test roll out
without them, so the 14-day tester clock never starts, so production access
cannot be applied for. No amount of code work moves this. Every day it slips
is a day on the end of the launch.

Done when: the closed-testing release passes "Review release" with no graphics
errors listed.

Why not Claude: it is art. The icon was a resize of an existing file, which is
why that one is done.

### 6. Get 12 testers opted in, and keep them there — **Dinesh**

The Choner.io Play account is a **personal** developer account, so production
access needs at least 12 testers opted in to a **closed** test for 14
continuous days. Internal testing does not count towards it, which is why
`eas.json` moved to the `alpha` track in #184.

Recruit about 15, not 12. One dropout puts the count under the line, and a
replacement has to serve their own 14 days from scratch.

Do not use paid tester services. Google rejects applications where the testing
looks inauthentic and it can cost the account.

What breaks if it is skipped: nothing else matters. This clock is longer than
all the remaining engineering work put together, and it cannot start until
item 5 is done and Google has reviewed the first closed release, which itself
takes several days.

Done when: the closed track shows 12 or more testers opted in, and the date
that happened is written down, because that date is the one that decides the
launch and nothing else does.

Why not Claude: they are real people who have to accept an invite on their own
phones.

### 7. Declare trader status — **Dinesh**

Play Console home shows "Declare your trader status" as Action required, with a
February 2027 deadline. It does not block this release, so it should not pull
anyone off items 5 and 6 today.

Worth knowing before doing it: declaring as a trader publishes a name and
address on the public store listing, and a personal account selling anything
generally counts as one.

What breaks if it is skipped: past the deadline, Google removes the developer
profile and all its apps globally.

Done when: the banner is gone from Play Console home.

Why not Claude: account-owner-only, and it is a legal declaration about a
person.

### 8a. Apply one database change before the time wheel update ships — **Gayan**

`supabase/migrations/202611101500_each_picks_their_own_time.sql`, from the
issues 190 to 193 branch. It lets the person answering a "Different times"
suggestion add their own time.

**If it is skipped:** once the app update is out, tapping "Sounds good" on a
"Different times" suggestion fails with "Could not do that". Everything else
works. So: apply this first, then publish the update.

**How you know it worked:** in the SQL editor,
`select pg_get_function_arguments('public.accept_plan_proposal'::regproc);`
returns `p_proposal_id uuid, p_my_at timestamp with time zone DEFAULT NULL`.

### 8b. Apply the "invite works once" database change — **Gayan**

`supabase/migrations/202611101700_an_invite_works_once.sql`, from the
invite-link-once branch. The app update already stops a used or expired link
by itself; this makes the server refuse as well, so an older app on someone's
phone cannot join twice or over an existing partner.

**If it is skipped:** the app is still fixed, but the server keeps the old
holes for anyone not on the new version.

**How you know it worked:** on a phone still on the OLD app version, signed in
as the account that accepted WALW89, tap the WALW89 link. It says the invite
was already used instead of "You're in!".
### 8. Create `app.choner.io` and upload the invite site — **Dinesh** (DONE 10 Nov, checked live)

The fix for the WhatsApp invite (#193) is written and switched off. Invites
keep going out as the untappable `choner:///invite/...` until this is done,
because the address the new link points at does not exist yet.

In Namecheap cPanel:

1. **Domains** (or **Subdomains**), create `app.choner.io`. Note the folder it
   gives you, usually `app.choner.io` or `public_html/app`.
2. **File Manager**, top right **Settings**, tick **Show Hidden Files**. Two of
   the things below start with a dot and are invisible without this.
3. Upload everything inside `web/invite/` from the repo into that folder,
   keeping the layout:

```
.htaccess
index.html
logo.png
og-invite.jpg
.well-known/apple-app-site-association
```

4. If cPanel has not already done it, turn on the free SSL certificate for the
   new subdomain (**SSL/TLS Status**, **Run AutoSSL**).

**How you know it worked:** open `https://app.choner.io/invite/WALW89` on a
phone. You see "You have been challenged." and the code WALW89 in a box.

**Then tell Claude.** Turning the link on is one line
(`INVITE_WEB_LIVE` in `lib/invite-link.ts`) and an over-the-air update.

**For Android to open the app directly**, rather than the page first, one more
value is needed: Play Console, **Test and release**, **App integrity**,
**App signing**, copy the **SHA-256 certificate fingerprint**. Paste it to
Claude and it becomes one more small file to upload. Not needed for the link to
work.

### 8c. Check Apple's time wheel on an iPhone before release — **Dinesh**

The next store build has Apple's own wheel for the time on iPhone. Before it
goes to the store, on a TestFlight install:

1. Plan a session and look at the picker: the day column on the left, Apple's
   wheel on the right, one row, both grey.
2. **Settings, General, Date & Time, turn on 24-Hour Time**, then open the
   picker again. Note whether the wheel shows AM/PM or 19:00.
3. Your phone is on the Persian calendar: the day column should still read
   "Today", "Tomorrow", "Thu 12 Nov", never Aban.

**If 2 shows 19:00:** tell Claude. It is a cosmetic mismatch, not a broken
picker.

### 8e. Apply the partner profile database change — **Gayan**

`supabase/migrations/202611131200_partner_profile.sql`, on the #199 branch.
Apply it before the build with the partner profile goes out.

**If it is skipped:** the profile still opens, but without the area, the
"Photo confirmed" tick, or the Why answers (it says the answers are missing).

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
