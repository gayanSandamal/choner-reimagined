# Google Play: the Data safety form

Written 6 November 2026, from the code rather than from a template. Play
Console → Policy → App content → Data safety.

Every answer below has a source in the repository, named. Where the honest
answer is a judgement call rather than a fact, it says so and gives a
recommendation. Where the code cannot tell us, it says that instead of guessing.
Nothing here is filled in to look tidy.

**Why this matters more than it looks.** The Data safety declaration is
published on the store page next to the install button, and Google compares it
against the privacy policy it can also read. A mismatch between the two is an
enforcement matter, not a rejection you can fix in a resubmission. The privacy
policy this has to agree with is [web/legal/privacy.html](../../web/legal/privacy.html),
live at `https://choner.io/privacy.html`.

---

## Before the data types: the three answers that frame everything

**1. Does your app collect or share any of the required user data types?**
**Yes.**

**2. Is all of the user data collected by your app encrypted in transit?**
**Yes.** Every call the client makes goes to Supabase over HTTPS
(`lib/supabase.ts`, with the URL from `EXPO_PUBLIC_SUPABASE_URL`, which is
`https://bkncpybneoqjnkhhchxg.supabase.co` in both the preview and production
EAS profiles). Photos are fetched through signed HTTPS URLs
(`lib/avatars.ts`). There is no plain `http://` endpoint anywhere in the
client.

**3. Do you provide a way for users to request that their data be deleted?**
**Yes, and both routes exist.**
* In-app: Settings → Delete account (`app/settings/index.tsx` →
  `features/profile/api.ts` → the `delete-account` edge function, which clears
  Storage objects first and then calls the `delete_account()` RPC).
* Web, for someone who has uninstalled: `https://choner.io/delete-account/`.
  **This page is live and complete** (checked 6 November 2026). It lists what
  is deleted, what is kept and for how long, and carries both the in-app route
  and an email route. Paste that URL into the deletion URL field.

Play also asks whether users can request **deletion of some data without
deleting the account**. **Yes, partly:** profile fields (goal, struggle,
accountability style, energy level, photo, area) can be cleared from Edit
profile. Answer the question honestly as "account deletion and partial data
deletion", not account deletion alone.

---

## The word "shared", and why it is No everywhere

Play's definition of **shared** is a transfer of user data to a **third party**,
and it explicitly excludes transfers to a **service provider** processing data
on the developer's behalf.

Everything outside Choner that touches user data is a processor, not a
recipient: **Supabase** (database, auth and storage, hosted in Singapore),
**Resend** (verification, invitation and notice emails), **Expo's push service
with Google FCM** behind it (notification delivery), and **Cloudflare** (web
page visit counts, no cookies, no app data). Those four match the privacy
policy's list exactly.

There is a **fifth, possibly live, and not in the policy: Google Places.** See
flag 1 below before filing this form.

So **Shared = No for every data type.** If anyone adds a processor, or an
advertising or analytics vendor, that answer changes and so does the privacy
policy, in the same change.

**The one arguable case is the partner.** A partner sees your first name, your
photo, the agreed activity, your area and whether you showed up. That is a
transfer to another person, but it is the user's own action inside the product
and it is prominently disclosed before it happens, which is the exception
Play's definition carves out. The settled industry reading is that other users
of the same app are not third parties for this purpose. **Recommendation: Shared
= No, and do not volunteer a different answer.** If Google ever asks, the
answer is the privacy policy's "What your partner sees" section, which already
says precisely this. Flagged as a judgement call rather than a fact.

---

## Data types: the complete pass

Play asks the same four things about every type it lists: collected, shared,
processed ephemerally, and required or optional. "Optional" in Play's sense
means the user can use the app without providing it.

### Location

| Type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|
| Approximate location | **Yes** | No | Required | App functionality |
| Precise location | **No** | | | |

Two different things are stored. `profiles.city` is derived from the device
**timezone** at signup, not from location services
(`city_from_timezone()` in `202608181200_city_and_milestones.sql`, which turns
`Asia/Colombo` into `Colombo`); it scopes the Community feed and the matching
pool. `location_tags` holds the neighbourhood the user picks by hand from a
fixed list of 70 Colombo and Greater Colombo areas (`public.locations`,
`202609181900_location_corridors.sql`), used to decide who could realistically
meet up.

**Precise location is a confident No.** The app declares no location permission
(`app.json` android permissions is `POST_NOTIFICATIONS` only),
`expo-location` is not a dependency, and nothing reads the device position.

**Approximate location is the judgement call.** Google's type is worded as
device or user physical location, and its threshold for "approximate" is an
area of 3 square kilometres or more. A Colombo ward can be smaller than that,
and nothing here comes from the device. The defensible reading is that a
self-entered neighbourhood is still location information about the user.
**Recommendation: declare it.** Over-declaring is not a policy violation.
Under-declaring is. The purpose field is where the nuance goes, and the privacy
policy already says it in one line: "A neighbourhood, never your exact position:
the app does not ask for or read device location."

Marked **Required** because `city` is set automatically at signup with no
opt-out. The neighbourhood tag on its own is optional, but Play asks per type,
not per column, and the stricter of the two wins.

### Personal info

| Type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|
| Name | **Yes** | No | Required | App functionality, Account management |
| Email address | **Yes** | No | Required | App functionality, Account management, Developer communications |
| User IDs | **Yes** | No | Required | App functionality, Account management |
| Other info | **Yes** | No | Required | App functionality |
| Address | No | | | |
| Phone number | No | | | |
| Race and ethnicity | No | | | |
| Political or religious beliefs | No | | | |
| Sexual orientation | No | | | |

* **Name** is `profiles.full_name`, taken at sign-up
  (`app/(auth)/sign-up.tsx`). Only the first name is ever shown to anyone else.
* **Email address** is the auth identity (`supabase.auth`), required for
  verification and for the First 200 link-up, and used by Resend for
  verification, invitations and notices. Developer communications is a real
  purpose here, not a padding answer.
* **User IDs** is the Supabase auth UUID, which is the primary key of almost
  every table.
* **Other info** is `profiles.age_range` (five bands from 18-24 up) and
  `profiles.gender` (male, female, prefer not to say). Both are collected in
  onboarding with **no skip** (`app/onboarding/age.tsx`, which says so in a
  comment: matching cannot work without them), so they are Required. "Prefer
  not to say" is the opt-out for gender, which is the honest way to read Play's
  question, but the field itself is still required.
* **Phone number is a confident No,** and better than that: the chat filter
  actively blocks phone numbers from being sent at all
  (`features/plans/chat-filter.ts`, mirrored server-side in
  `meetup_message_problem()`).

### Financial info

**Nothing collected.** All five subtypes are No.

`react-native-purchases` is a dependency and a `subscriptions` table exists,
but `configurePurchases()` returns early with no API key set
(`lib/billing.ts`), the production EAS profile sets no
`EXPO_PUBLIC_REVENUECAT_*` key, and `features.pro` defaults to false
(`constants/features.ts`), which hides the paywall app-wide. There is no path
to a purchase in this build, so **answer No and also answer "No" to in-app
purchases in Store settings.**

**This is the single most likely answer to go stale.** The day Pro ships,
Purchase history becomes collected, the in-app purchases flag changes, and the
privacy policy needs RevenueCat added to its processor list. All three in the
same change.

### Health and fitness

| Type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|
| Fitness info | **Yes** | No | Required | App functionality |
| Health info | **No** (see below) | | | |

**Fitness info is the product.** What is stored: the activity
(`user_challenges.activity_key`, one of running, jogging, walking, cycling,
yoga, home workouts), the mode (together, separately, either), the agreed
distance or duration, the chosen exercises for a workout, planned session days
and times, every check-in and its value (`challenge_checkins`,
`202609181800_checkin_value_capture.sql`), misses and the reason given
(`202609101200_miss_reason_capture.sql`), the shared streak
(`202609101000_shared_partner_streak.sql`), and the sessions owed.

**Health info is No, and the column name is misleading.** `profiles.stress_level`
is filled from a screen that asks "How are you feeling this week?" with the
answers Low, Medium and High energy (`app/onboarding/energy.tsx`,
`ENERGY_LEVELS` in `features/onboarding/constants.ts`). That is a self-reported
energy level used to size the first week, not a medical record, a symptom or a
measurement. There is no sensor data, no heart rate, no weight, no sleep, no
Health Connect integration.

**Recommendation: Fitness info yes, Health info no.** Flagged because the column
name says "stress", and anyone auditing the schema without reading the screen
will reach a different conclusion. The column should be renamed at some point;
that is not this task.

### Messages

| Type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|
| Other in-app messages | **Yes** | No | Optional | App functionality |
| Emails | No | | | |
| SMS or MMS | No | | | |

The meetup chat (`meetup_messages`, `components/plans/MeetupChat.tsx`) is free
text between two matched partners, stored on the server. It is time-boxed: it
opens when both say they are at the meeting place and disables at the QR scan.
Phone numbers, email addresses, links and social handles are rejected before
sending, both client-side and in the database.

Also user text, and declared under this type: the fixed opener and canned
replies, and the free-text meeting place suggestion.

**Optional** because the app is usable without ever typing in the chat, and
because a "separately, together" pair never meets so the chat never opens.

### Photos and videos

| Type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|
| Photos | **Yes** | No | Optional | App functionality |
| Videos | **No** | | | |

Two kinds. The **profile photo** is optional at onboarding and skippable
("Set up later" in `app/onboarding/photo.tsx`), stored in the private `avatars`
Storage bucket as a path and served through signed URLs. The **check-in photo**
only exists for habits whose proof type is photo, is camera-only with no gallery
fallback on purpose (`features/challenges/capture.ts`), is visible to the
partner once, and is **deleted as soon as the partner has viewed it and in every
case within 7 days** (`202609101800_checkin_photo_cleanup_sweep.sql`).

**Videos is No.** A video proof clip ("Show Me") was decided on 19 October but
is not built: `resolveProofType` returns `tap` or `photo` only, and capture is
`ImagePicker` stills. That answer changes when the clip ships.

Play offers **"processed ephemerally"** as an option. Do not tick it for photos:
7 days is not ephemeral in Play's sense, and the profile photo is kept as long
as the account.

### Audio files

**Nothing collected.** All three subtypes No. The microphone is switched off
deliberately in two places in `app.json`: `expo-image-picker` has
`microphonePermission: false` and `expo-camera` has `recordAudioAndroid: false`.

### Files and docs

**No.** The only file picker in the app is the image picker for the profile
photo, which is Photos, not Files and docs. No document picker, no storage
browsing.

### Calendar

**No.** Sessions are planned inside the app. Nothing reads or writes the device
calendar.

### Contacts

**No.** Invitations go out through the OS share sheet
(`lib/invite-link.ts`), which hands the message to WhatsApp or Messages without
giving the app access to the address book. No contacts permission is declared.

### App activity

| Type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|
| App interactions | **No** (see below) | | | |
| In-app search history | No | | | |
| Installed apps | No | | | |
| Other user-generated content | **Yes** | No | Optional | App functionality |
| Other actions | **No** (see below) | | | |

**App interactions is No, which surprises people.** An `analytics_events` table
exists (`202605240114_production_data.sql`) and the app never writes to it: the
only reference anywhere outside the migration is the generated type in
`types/database.ts`. PostHog is a dependency and `track()` exists in
`lib/observability.ts`, and `track()` is never called from anywhere in the app.
See the **Analytics and crash reporting** section below, which is the part of
this form most likely to be wrong in six weeks.

**Other user-generated content, in full:** the reason for starting, the "why",
which is private and never shown to the partner
(`202608131000_challenge_setup_why.sql`); the reason given for a missed day,
from a fixed list plus free text; the typed meeting place suggestion; the
milestone the user chooses to share to their city's Community feed; the report
category and anything written with it; and the user's own name and photo as
displayed to a partner.

Worth knowing for the content rating file too: the **Community feed carries no
free text.** A milestone row is a system-worded line built from the kind, the
habit title and the streak count, plus a first name and avatar
(`milestones` table, `components/community/MilestoneRow.tsx`). There is no post
button in the app. The `posts`, `post_comments` and `groups` tables exist and no
screen reaches them.

**Other actions is No.** The check-ins, streaks and session history are already
declared under Fitness info, and Play's guidance is to declare data once where
it fits best rather than spreading it across types.

### Web browsing

**No.** No in-app browser, no history, nothing.

### App info and performance

| Type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|
| Crash logs | **No, today** | | | |
| Diagnostics | **No, today** | | | |
| Other app performance data | **No, today** | | | |

See the next section. This is the answer that is correct right now and most
likely to become wrong.

### Device or other IDs

| Type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|
| Device or other IDs | **Yes** | No | Optional | App functionality |

`user_devices` stores an **Expo push token** and the platform string
(`features/notifications/api.ts`). The token identifies one install on one
device, which is what Google's definition of this type describes. The token is
only written if `registerForPushNotificationsAsync()` returns one, which needs
the user to grant the notification permission, so **Optional** is correct.
`google-services.json` ships with the app, so Firebase Cloud Messaging is also
in the path and mints its own installation identifier.

Retention, from the privacy policy and true of the code: the token is replaced
on reinstall and removed with the account.

**Advertising ID: not used.** No ads SDK, no `AD_ID` permission declared, no
advertising identifier read anywhere. Answer "no" if Play's advertising ID
declaration asks, and leave the permission out of the manifest.

---

## Analytics and crash reporting: the honest answer, and its expiry date

Sentry and PostHog are **both installed and both switched off**, so the
truthful answer today is that Choner collects no crash logs, no diagnostics and
no analytics.

What makes that true, specifically:

* `lib/observability.ts` guards every Sentry call behind `EXPO_PUBLIC_SENTRY_DSN`
  and every PostHog call behind `EXPO_PUBLIC_POSTHOG_KEY`. Without a DSN,
  `Sentry.init()` never runs. Without a key, the PostHog client is never
  constructed and stays `null`, so `posthog?.capture()` is a no-op.
* Neither variable is set in the **production** EAS profile (`eas.json`), which
  is the profile the 29 October AAB was built from. The production env block
  sets `EXPO_PUBLIC_ENV`, `SENTRY_DISABLE_AUTO_UPLOAD` and the two Supabase
  values, and nothing else.
* `track()` is never called from any screen, so even with a key there would be
  no product analytics, only whatever PostHog captures automatically.

**Three things change the moment a DSN or key is added**, and whoever adds one
owns all three:

1. **Crash logs, Diagnostics and Device or other IDs** flip to collected on this
   form, and so does **App interactions** if `track()` starts being called.
2. **The email address leaves the country.** `providers/app-provider.tsx:101`
   calls `identifyUser(userId, { email: userEmail })`, which passes the email
   straight to `Sentry.setUser()` and `posthog.identify()`. That makes Email
   address collected by a processor the privacy policy does not list, which is
   exactly the mismatch Google enforces on.
3. **The privacy policy has to be edited in the same change.** It currently says
   so itself, in a comment at the top of
   [web/legal/privacy.html](../../web/legal/privacy.html): the processors built
   but not switched on are named there precisely so nobody enables one quietly.

**Recommendation: leave both off until after the first submission.** Turning
them on costs a Data safety refiling and a policy edit, and neither is free
once the listing is live.

---

## Flagged: things this form cannot be derived from the code

Five items, in descending order of how much they matter.

**1. Google Places may be a live processor that the privacy policy does not
name.** When a pair agrees where to meet, the typed text goes to
`searchPlaces()` (`features/plans/api.ts:34`), into the `places-autocomplete`
edge function, and from there to Google's Places Autocomplete API, restricted
to a Greater Colombo rectangle. It is wired up and reachable from the real UI
(`components/plans/steps/PlanningSteps.tsx:204`), which makes it different from
Sentry and PostHog.

**Whether anything actually reaches Google depends on one Supabase secret,
`GOOGLE_PLACES_API_KEY`, and the repository cannot tell us if it is set.** The
function returns empty suggestions and the free-text field keeps working without
it, so the feature degrades silently either way.

* **If the key is set:** the privacy policy's "That is the complete list" is
  wrong, and Google Places has to be added to the processor list before this
  form is filed. The data going there is a partial place name a user typed,
  capped at 100 characters, with no name and no user id attached, which is the
  mildest possible version of the problem. It is still a processor the policy
  denies exists.
* **If the key is not set:** nothing to do, and the policy is accurate.

**Ask Gayan which it is.** It is one `supabase secrets list` away and it is the
first thing to settle on this page.

**2. The in-app privacy screen contradicts the hosted policy, and loses.**
`app/legal/privacy.tsx` tells the user, in the app, that Choner collects
"basic device telemetry used to deliver notifications and diagnose crashes",
"app version" and "crash reports and anonymized analytics events". **None of
that is true of this build.** It also mentions community posts and comments,
which no screen reaches. The hosted policy at `choner.io/privacy.html` is the
accurate one and is the URL Google reads, but a reviewer who opens the in-app
screen sees a claim that the Data safety form denies. **This needs fixing in the
app before submission**, and it is app code, so it is outside this task. Logged
here because it is the one item on this page that could cost a resubmission.

**3. Whether Supabase hosting in Singapore needs a data transfer statement.**
Play does not ask where data is stored, so there is nothing to fill in. The
privacy policy already says Singapore. Sri Lanka's PDPA may have something to
say about it and the policy is marked as not legally reviewed. Not a Play
blocker, but it is the kind of thing a lawyer finds in five minutes and nobody
else finds at all.

**4. What the edge functions log.** They run server-side, and server-side
logging is not user data collection in Play's sense unless it is retained and
tied to a user. Nothing in the repo
says what Supabase retains in its function logs or for how long. **Gayan is the
only person who can answer this.** It almost certainly changes no answer above,
but it is unverified rather than verified.

**5. Whether an already-built binary matters.** The AAB in EAS is from
29 October. Everything above was read from `main` on 6 November. If any
observability or billing env value was set in the EAS dashboard rather than in
`eas.json`, the binary could behave differently from what this file says, and
`eas.json` cannot show that. **Check the EAS project's environment variables
before filing this form.** Together with flag 1, this is what the repository
alone could not settle.

---

## Needs Dinesh

Only one thing here is a product decision rather than a reading of the code.

**Do we want analytics before launch or not?** This form is simplest and
safest with both Sentry and PostHog off, which is where they are. The cost is
that the first two weeks of real use produce no crash data and no funnel, during
the fourteen days of park work when the signal matters most. That trade is
yours: file the form as written and stay blind, or turn Sentry on now, add it to
the privacy policy, stop sending the email address to it, and declare crash logs
here. **My recommendation is to ship blind for the first submission** and turn
Sentry on as the first post-launch change, because a Data safety mismatch is a
worse problem than a crash you hear about from a tester in a park.
