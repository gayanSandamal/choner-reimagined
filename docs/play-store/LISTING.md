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
Choner
```

Six characters. **Decided by Dinesh, 7 November 2026.** The earlier draft here
was `Choner: Habit Partner`, on the argument that the app name is Play's
strongest ranking signal and nobody searching for a way to stick to a habit
will type a brand they have never heard. That was overruled in favour of the
clean brand, matching Apple and the rest of the brand everywhere else.

One consequence, and it is why the short description below changed: with no
keyword in the name, the short description is now the only indexed field
carrying any. It has to do that work.

### Short description

**Limit 80 characters.** The line under the title on the app page, and the only
copy that appears in search results.

```text
Meet new people. Find someone to build healthy habits with.
```

59 characters. From [POSITIONING.md](POSITIONING.md), which leads on social
discovery rather than on discipline or tracking.

### Full description

**Limit 4000 characters.** The copy below is about 3,200, so there is room to
grow, but not much.

**Play does not render Markdown here.** No `#`, no `**bold**`, no `-` bullets:
all three appear on the page as literal characters. The brief's draft was
written in Markdown and would have shipped with the asterisks visible. Play
accepts a small set of HTML tags and otherwise plain text with single line
breaks preserved, so the ALL CAPS lines below are doing the work headings would
do elsewhere.

Checked against the build on 7 November 2026, feature by feature. What changed
from the brief's draft, and why, is in [POSITIONING.md](POSITIONING.md) under
"Checked against the build".

```text
Meet someone new. Find something healthy to do together.

What if meeting someone new could also help you build a healthier habit?

Choner pairs you with one other person who wants to do the same activity as you, so neither of you has to start alone. You agree what you are doing, you both show up, and it gets easier to keep going.

HOW CHONER PAIRS YOU

Tell us what you are working towards: move more, get stronger, reduce stress, or improve your energy. Pick something you will actually do, from running, jogging, walking, cycling, yoga or home workouts. Say how you want to show up, and choose the part of the city you are in.

Choner then finds you one partner and shows you who they are. You can accept, or pass and look again. There is no feed of strangers to scroll, no profiles to browse, and nobody to message out of the blue. One person, one activity, agreed by both of you.

Already have someone in mind? Invite them with a code instead.

CHOOSE HOW YOU SHOW UP

Together: meet in person and do the activity side by side.

Separately, together: do the same thing in your own space at the same time, and keep each other to it.

WHAT YOU DO TOGETHER

Agree the session. The distance, the day, the time, and where to meet, one step at a time. Nothing is set until you both say yes.

Show up. On the day you each say when you are on your way. A short chat opens while you are finding each other, and when you meet you scan each other's code so the session counts for both of you.

Check in. Tap to log it, or send a photo for your partner. Photos are a trade: theirs appears once you have sent yours, each one is seen once, and they are deleted within seven days.

Keep the streak. It belongs to the two of you, not to you alone. Miss a day and you owe a session rather than losing everything, and you can repair it. If your partner goes quiet you can nudge them, and they can nudge you.

Community shows what people in your city chose to share this week: a first name, what they did, and nothing to scroll for hours. There is no post button and nobody to follow.

SAFETY

Choner is for people aged 18 and over.

Choner is not a dating app. You are matched with one person, for one activity, and the whole app is built around that.

You pick the area you are in, never your exact position. The app does not ask for or read your device location.

Your partner sees your first name, your photo if you added one, the activity you both agreed, your area, and whether you showed up. They do not see your email address or your reasons for starting.

You can report or block a partner from anywhere you can see them. A person on our team reads every report, it ends the match, and the other person is never told who did it or why.

Phone numbers, email addresses and links cannot be sent in the chat. Keeping it in the app is what lets us help if something goes wrong.

WHERE CHONER WORKS

Choner is starting in Colombo. In-person matching covers Colombo and Greater Colombo, and whether a partner is available depends on your area and what you choose.

Questions, problems, or anything at all: hello@choner.io

Choner. Turn 'I should' into 'I did.'
```

Three lines in that copy are deliberate and worth defending if anyone asks to
cut them:

* **"There is no feed of strangers to scroll, no profiles to browse."** This is
  the accuracy fix. `app/find/who-else.tsx` says in its own comment that the
  directory is "proof that real people are here, never a candidate list.
  Read-only on purpose: a card does not open a profile, and there is no message
  or match action." Copy that promises discovery of people sets up an
  expectation the build refuses, which is a one-star review and, if a reviewer
  notices, a misleading-listing rejection.
* **"Choner is not a dating app."** Choner pairs strangers by area and activity
  and then arranges for them to meet in a park, and the listing now *leads*
  with meeting someone new. A reviewer will have the same thought a user would,
  and saying it first is cheaper than being re-categorised. The brief's own
  guardrails say not to be positioned as a dating app; this is the line that
  does that work.
* **"Choner is starting in Colombo."** The location list in the app is Colombo
  and Greater Colombo only, and the Community feed is scoped to your city. A
  listing that implies a global product earns one-star reviews from people in
  cities with nobody to match them to. The brief marks this optional. It is
  kept, because it accurately describes the launch configuration, which is the
  brief's own condition for keeping it.

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

For the first closed test build, from [POSITIONING.md](POSITIONING.md):

```text
Meet Choner!

Find someone who wants to do the same healthy activity as you, agree a session, and start showing up together.

Your next activity partner could be someone you have never met.

This is an early test release. If something breaks or reads wrong, tell us at hello@choner.io. We read everything.
```

The brief's draft opened "Discover people who share your interest", which has
the same browse problem as the full description had. Reworded to the matching
flow that exists. The last paragraph is added because this is a closed test and
testers need somewhere to send what they find.

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

## Decided

**1. The app name is `Choner`.** Decided by Dinesh, 7 November 2026, against
the recommendation here, which was `Choner: Habit Partner` for search. The
brand wins. See the app name section for the knock-on effect on the short
description.

**2. The category is Health & Fitness.** Decided by Dinesh, 7 November 2026.
The alternative was Social, which is arguably honest given partner matching, a
chat and a city feed, but it files Choner next to dating and messaging apps,
which is the exact association the listing spends a line denying. Switching
later resets how Play has learned to rank the listing, so this is a pick-once
call and it is made.

**3. The positioning leads with meeting someone new**, not with discipline,
tracking or weight loss. From [POSITIONING.md](POSITIONING.md), which is the
source of truth for this and for launch marketing. The hierarchy is: meeting
new people is the attraction, the shared healthy activity is the reason to
connect, consistency is the outcome.

**4. Who the listing talks to** follows from 3. It is written to someone who
likes the idea of meeting a person to do something with, not to someone who has
already decided to fix their discipline. That is a change from the earlier draft
here, which was written to someone who had failed at a habit alone.

One thing that is **not** a question: the description must not mention the AI
coach, Pro, subscriptions, live video, live maps or instant sessions. None of
them is in the build, and the brief lists all of them as directions that must
not be represented as existing features. A listing that promises a feature the
app does not have is a removal, not a rejection.

## Current state, 7 November 2026

* Play developer account: **exists**, personal account "Choner.io", account ID
  8982616440901029351.
* Play app record: **exists**, `io.choner.app`, last updated 29 October,
  currently on the Internal testing track. Confirmed from the console on
  7 November. Do not press Create app: the package name is already correctly
  claimed, and pressing it again returns "This package name is already in use".
* Binary: a production AAB at **versionCode 4**, built 7 November from `edb95da`,
  supersedes the versionCode 3 bundle sitting on Internal testing.
* Main store listing: **nothing written into the console yet**. The copy above
  is ready to paste.
* Graphics: **app icon done** (512 x 512, exported 7 November). Feature graphic
  and screenshots **do not exist**. This is the long pole. See
  [ASSETS.md](ASSETS.md) and `docs/BLOCKED_ON_YOU.md`.
* Privacy policy, terms and deletion pages: **all three live**, checked
  6 November 2026.
* Data safety, content rating, target audience: **not filed**. Answers drafted
  in the other three files.
* Trader status: **not declared**. Play shows this as Action required with a
  February 2027 deadline, so it does not block this release.
* The 14-day clock: **not started**. A personal developer account needs a closed
  test with at least 12 testers opted in for 14 continuous days before
  production access can be requested. It is longer than everything else on this
  page put together.
