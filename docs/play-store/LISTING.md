# Google Play: the store listing

Written 6 November 2026. This is the Android half of the store paperwork. The
Apple half is [APP_STORE_CONNECT.md](../APP_STORE_CONNECT.md) and nothing here
repeats it: no bundle IDs, no certificates, no TestFlight.

Three facts to have in front of you before you open the console:

* The Android package is **`io.choner.app`**. Not `com.choner.app`, which is
  the iOS bundle ID. `docs/SHIPPING_CHECKLIST.md` line 53 says to create the
  Play app as `com.choner.app` and **that line is wrong**. A Play app's package
  name can never be changed, so getting this right is the single most expensive
  thing on the page.
* Version is 0.2.0. The `versionCode` comes from EAS, not from `app.json`
  (`eas.json` sets `appVersionSource: remote` with `autoIncrement` on the
  production profile), so do not try to reason about it from the repo.
* A production AAB from 29 October already exists in EAS. The listing is what
  is missing, not the binary.

The four files in this folder cover the four slow pieces:

| File | Covers |
|---|---|
| this one | Main store listing, store settings, and the index of every App content section |
| [DATA_SAFETY.md](DATA_SAFETY.md) | The Data safety form, answer by answer |
| [ASSETS.md](ASSETS.md) | The art that does not exist yet, to spec |
| [CONTENT_RATING.md](CONTENT_RATING.md) | The IARC questionnaire and the target audience section |

---

## Main store listing

Play Console → Grow → Store presence → Main store listing. Every field below is
required unless it says otherwise.

### App name

**Limit 30 characters.** Shown under the icon everywhere in Play.

```text
Choner: Habit Partner
```

21 characters. Plain `Choner` (6 characters) is the other candidate and is what
the Apple doc picked. See **Needs Dinesh** at the bottom: this is a positioning
call, not a technical one.

### Short description

**Limit 80 characters.** The line under the title on the app page, and the only
copy that appears in search results.

```text
Get paired with one person who shows up, so you stop starting over.
```

67 characters.

Two alternates at the same length, if the first reads too blunt:

```text
Keep the habit you keep restarting. One partner, same commitment, nearby.
```

```text
Habits are easier with someone counting on you. Choner finds you that person.
```

### Full description

**Limit 4000 characters.** The copy below is 2,989 characters, so there is room
to grow if a section is missing, but not much. Anything added should replace
something.

Written from what the app actually does. Every feature named here is reachable
in the shipped build: the partner match, the invite code, the session plan, the
QR scan, the time-boxed chat, the tap or photo check-in, the shared streak, the
session owed, the nudge, the city Community feed, report and block. Nothing in
it describes the AI coach, Pro, live video or groups, all of which exist in the
repo and none of which ship.

No em dashes, as standing instruction. Play renders this as plain text with
single line breaks preserved, so the ALL CAPS lines are doing the work headings
would do elsewhere. Play does not allow bold or headings here.

```text
Choner pairs you with one other person so neither of you has to keep a habit alone.

You know how this goes. You decide to start running. You go twice. Something comes up, the week slips, and a month later you are starting over again. Nothing was wrong with the plan. There was just nobody waiting for you.

Choner gives you that person.

FINDING YOUR PARTNER

Tell us what you are working towards: move more, get stronger, reduce stress, or get your energy back. Pick something you will actually do, from running, jogging, walking, cycling, yoga or home workouts. Say how you want to show up, either meeting up in person or doing the same thing separately at the same time, and pick the part of the city you are in.

Choner then finds you one partner. Not a feed of strangers, not a leaderboard, not a group chat. One person with the same commitment, near you, at a similar stage. If you already have someone in mind, invite them with a code instead.

WHAT YOU DO TOGETHER

Agree the session. The distance, the day, the time, and where to meet, one step at a time. Nothing is set until you both say yes.

Show up. On the day you each say when you are on your way. A short chat opens while you are finding each other, and when you meet you scan each other's code so the session counts for both of you.

Check in. Tap to log it, or send a photo for your partner. Photos are a trade: theirs appears once you have sent yours, each one is seen once, and they are deleted within seven days.

Keep the streak. It belongs to the two of you, not to you alone. Miss a day and you owe a session rather than losing everything, and you can repair it. If your partner goes quiet you can nudge them, and they can nudge you.

Community shows what people in your city chose to share this week: a first name, what they did, and nothing to scroll for hours. There is no post button and nobody to follow.

SAFETY

Choner is for people aged 18 and over.

You pick the area you are in, never your exact position. The app does not ask for or read your device location.

Your partner sees your first name, your photo if you added one, the activity you both agreed, your area, and whether you showed up. They do not see your email address or your reasons for starting.

You can report or block a partner from anywhere you can see them. A person on our team reads every report, it ends the match, and the other person is never told who did it or why.

Phone numbers, email addresses and links cannot be sent in the chat. Keeping it in the app is what lets us help if something goes wrong.

WHAT CHONER IS NOT

It is not a dating app. It is not a chat app. It is not a tracker counting your steps in the background.

One partner. One commitment. One question at the end of the week: did you both show up?

Choner is starting in Colombo. Matching works best where there are other people nearby with the same commitment, so the earliest days are the thinnest.

Questions, problems, or anything at all: hello@choner.io
```

Two things in that copy are deliberate and worth defending if anyone asks to
cut them:

* **"It is not a dating app."** Choner pairs strangers by area and activity and
  then arranges for them to meet in a park. A reviewer will have the same
  thought a user would, and saying it first is cheaper than being
  re-categorised.
* **"Choner is starting in Colombo."** The location list in the app is Colombo
  and Greater Colombo only, and the Community feed is scoped to your city. A
  listing that implies a global product earns one-star reviews from people in
  cities with nobody to match them to.

### Graphics

All four graphic slots are empty and none of the art exists. Sizes, formats and
which screens to shoot are in [ASSETS.md](ASSETS.md).

| Slot | Required | State |
|---|---|---|
| App icon, 512 x 512 | yes | source exists at `assets/icon.png` (1024 x 1024), needs an export |
| Feature graphic, 1024 x 500 | yes | does not exist |
| Phone screenshots, 2 to 8 | yes, minimum 2 | none exist |
| Promo video | no | skip for the MVP |

---

## Store settings

Play Console → Grow → Store presence → Store settings.

| Field | Value |
|---|---|
| App category | Health & Fitness |
| Tags | Up to 5, from Play's own fixed list. Pick in the console; the list is not published anywhere we can copy from, so do not pre-write these |
| Store listing contact: email | `hello@choner.io` |
| Store listing contact: website | `https://choner.io` |
| Store listing contact: phone | optional, leave blank |
| External marketing | leave on unless there is a reason not to |

**App category is a real decision, not an obvious one.** Choner has partner
matching, a chat and a city feed, which is most of what a social app has.
Health & Fitness is still right: the thing a user comes for is the habit, and
the social parts are machinery. It also keeps Choner out of a shelf full of
dating and messaging apps. Flagged below anyway.

**Health & Fitness carries one extra form.** Play asks apps in that category to
complete a **Health apps declaration** (App content → Health apps). Choner is
not a medical app, does not give medical advice and takes no health
measurements, so the answers are all "no", but the form has to be submitted or
the release is blocked. The health disclaimer users already agree to at sign-up
(`app/legal/health-disclaimer.tsx`) is the text to quote if it asks.

---

## What's new

**Limit 500 characters per language.** Release notes, attached to the release
rather than the listing.

For the first closed test build:

```text
The first build of Choner. Pick a habit, get paired with one person near you, agree a session, and show up together.

This is an early test release. If something breaks or reads wrong, tell us at hello@choner.io. We read everything.
```

232 characters.

---

## Every App content section, and where its answer lives

Play Console → Policy → App content. A release is blocked until all of these
are green, and most of them are a single screen of questions.

| Section | Answer | Where |
|---|---|---|
| Privacy policy | `https://choner.io/privacy.html` (live, checked 6 Nov 2026) | here |
| App access | Not all functionality is public. A demo account is required | below |
| Ads | No, the app contains no ads | here |
| Content rating | IARC questionnaire | [CONTENT_RATING.md](CONTENT_RATING.md) |
| Target audience and content | 18 and over only | [CONTENT_RATING.md](CONTENT_RATING.md) |
| News apps | No | here |
| Health apps | Declaration required because of the category. All "no" | above |
| Financial features | None. No purchases, no lending, no crypto | here |
| Data safety | The long one | [DATA_SAFETY.md](DATA_SAFETY.md) |
| Government apps | No | here |
| Advertising ID | Not used. See the note in DATA_SAFETY.md | [DATA_SAFETY.md](DATA_SAFETY.md) |

### App access, in full

Choner shows nothing without an account, so a reviewer who cannot sign in will
fail the app. This is the same trap as Apple's guideline 2.1 and it catches more
first submissions than anything else.

Create a real account on production and leave it in a useful state: onboarding
finished, an activity chosen, a partner attached, and at least one session
already planned so the Challenges tab is not empty. Then fill in:

* **Any other instructions:** email and password for that account, plus one line
  saying the app is invite-free and the account is already paired.
* Add a second line if the paired state is fragile: a reviewer who ends the
  match cannot get it back, so say what to avoid.

A reviewer seeing an empty Home with no partner is the most likely way this
listing gets rejected for something that is not actually broken.

---

## Needs Dinesh

Four things here are yours, not mine. I have put a recommendation against each
so none of them blocks the paperwork, but none of them is settled.

**1. The app name.** I have written `Choner: Habit Partner`. The Apple doc picked
plain `Choner`. Plain `Choner` is cleaner and matches the brand everywhere else,
but nobody searching Play for a way to stick to a habit will type it, and the
app name is the strongest ranking signal Play has. The suffix costs nothing
visually because Play truncates to the colon in most places. My recommendation
is the suffix on Play and plain `Choner` on Apple, because Apple has a separate
subtitle field doing that job and Play does not. **Your call, and worth five
minutes rather than defaulting.**

**2. Who the listing is talking to.** The description above is written to
someone who has already failed at a habit on their own, which is the landing
page's framing ("ready to stop starting over"). It is not written to someone
looking for a running buddy, or to someone who wants to get fit and has not
tried yet. Those are three different first lines. I picked the one the repo
already uses.

**3. Whether to say "starting in Colombo" out loud.** It is honest and it
protects the early reviews. It also caps the listing at a city and makes the
product look smaller than the plan. I kept it in.

**4. App category.** Health & Fitness, or Social. I have recommended Health &
Fitness and explained why above. Switching later is possible but it resets how
Play has learned to rank the listing, so pick once.

One thing that is **not** a question: the description must not mention the AI
coach, Pro, subscriptions or live video. None of them is in the build. A listing
that promises a feature the app does not have is a removal, not a rejection.

---

## Current state, 6 November 2026

* Play developer account: **exists**, personal account "Choner.io".
* Play app record created: **unknown from here**, and it must use
  `io.choner.app`.
* Main store listing: **nothing written into the console yet**. The copy above
  is ready to paste.
* Graphics: **none exist**. This is the long pole. See
  [ASSETS.md](ASSETS.md).
* Privacy policy, terms and deletion pages: **all three live**, checked
  6 November 2026.
* Data safety, content rating, target audience: **not filed**. Answers drafted
  in the other three files.
* The 14-day clock: a personal developer account needs a closed test with at
  least 12 testers opted in for 14 continuous days before production access can
  be requested. That clock has not started. It is longer than everything else on
  this page put together.
