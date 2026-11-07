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

**Limit 4000 characters.** The final copy is **3715 characters**, in
[full-description.txt](full-description.txt), ready to paste with nothing to
strip out.

Written by Dinesh on 7 November 2026, replacing the draft that was here. It is
longer and more structured than the draft, and it keeps the positioning from
[POSITIONING.md](POSITIONING.md): meeting someone is the attraction, the shared
activity is the reason to connect, consistency is the outcome.

**Play renders no Markdown in this field.** No `#`, no `**bold**`, no `-`
bullets as syntax: all of them appear on the store page as literal characters.
The version Dinesh wrote was in Markdown, so the file is the converted one,
with headings in caps and the asterisks gone. Play accepts a small set of HTML
tags and otherwise plain text with single line breaks preserved.

Three things in that copy are load-bearing and should survive any future edit:

* **"No endless swiping, no profiles to browse and no strangers messaging you
  out of the blue."** This is the accuracy line. `app/find/who-else.tsx`
  describes itself in its own comment as "proof that real people are here,
  never a candidate list", with no profile to open and no match or message
  action, and `components/find/MatchOffer.tsx` offers exactly one partner at a
  time. Copy that promises discovery sets an expectation the build refuses,
  which is a one-star review, and a misleading listing is a removal rather
  than a rejection.
* **"It's about finding an activity partner, not a date."** Choner pairs
  strangers by area and activity and then helps them meet in person, and the
  listing leads with meeting someone new. A reviewer will have the same thought
  a user would, and saying it first is cheaper than being re-categorised.
* **"We're starting in Colombo, Sri Lanka."** The location list is Colombo and
  Greater Colombo only. A listing implying a global product earns one-star
  reviews from people in cities with nobody to match them to.

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
* Graphics: **app icon and feature graphic both done**, 7 November. The icon is
  a 512 x 512 export of `assets/icon.png`; the feature graphic is 1024 x 500,
  navy ground, paper wordmark with the full stop in `#FD8302`, the hook of the
  tagline in orange and the rest in near-white, set in the Poppins the app
  ships. **Screenshots still do not exist**, and they are now the only missing
  asset and the last thing blocking the closed test. Four of the six need a
  real matched pair on a real device, which is the same paired account App
  access needs. See [ASSETS.md](ASSETS.md) and `docs/BLOCKED_ON_YOU.md`.
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
