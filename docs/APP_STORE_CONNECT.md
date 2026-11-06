# App Store Connect: getting Choner onto TestFlight

Written 5 November 2026. The Apple Developer Program account went active on
27 October 2026 at 22:40, so nothing below is blocked on enrollment any more.

This is the iOS equivalent of what we already did on Google Play. It is mostly
browser work in two Apple websites, plus three values that have to come back
into this repo.

## The two Apple sites, and which does what

They look similar and are not.

* **developer.apple.com** is the account. It holds the membership, the Team ID,
  and the list of registered app identifiers (bundle IDs).
* **appstoreconnect.apple.com** is the store listing. It holds the app record,
  the screenshots, the description, TestFlight, and the review submission.

You need both. The account site first, because App Store Connect cannot create
an app for a bundle ID that does not exist yet.

## Step 1: register the bundle ID

developer.apple.com → Account → Certificates, Identifiers & Profiles →
Identifiers → the blue **+**.

* Register an **App ID**, type **App**.
* Description: `Choner`
* Bundle ID: **Explicit**, and type exactly `com.choner.app`

That string is in [app.json](../app.json) under `ios.bundleIdentifier`. It must
match character for character. If it does not, EAS builds will fail with a
provisioning error that does not say why.

> **Known inconsistency, not a blocker.** Android uses `io.choner.app` and iOS
> uses `com.choner.app`. Apple only cares about the iOS one. Leave it; renaming
> the iOS bundle later means a new app record, and renaming Android means a new
> Play listing. Both are worse than the inconsistency.

**Capabilities:** leave them all unticked. In particular leave **Sign In with
Apple** off. We deliberately dropped that entitlement (`usesAppleSignIn: false`)
because the feature is held back to v1.1, and a declared capability with no
feature behind it is something a reviewer can see.

## Step 2: create the app record

appstoreconnect.apple.com → Apps → the **+** → New App.

| Field | Value |
|---|---|
| Platforms | iOS only |
| Name | `Choner` |
| Primary language | English (U.K.) or English (U.S.), your call |
| Bundle ID | pick `com.choner.app` from the dropdown |
| SKU | `choner-ios-001` (internal only, never shown to anyone) |
| User Access | Full Access |

**If the name `Choner` is taken,** Apple will say so here. The fallback is a
display name like `Choner: Habits Together` with `Choner` still as the in-app
name. Deal with it if it happens, not before.

## Step 3: collect the three IDs

This is the part that comes back into the repo.
[eas.json](../eas.json) has three placeholders under `submit.production.ios`:

```json
"appleId": "REPLACE_WITH_APPLE_ID",
"ascAppId": "REPLACE_WITH_ASC_APP_ID",
"appleTeamId": "REPLACE_WITH_APPLE_TEAM_ID"
```

Where each one comes from:

* **appleId** is the email address of the Apple account, the one that got the
  welcome email. Not a secret, and not a password.
* **ascAppId** is a ten-digit number. App Store Connect → your app → App
  Information → the field labelled **Apple ID** in the right-hand column. It is
  confusingly named: it is the app's id, not yours.
* **appleTeamId** is ten characters, letters and digits.
  developer.apple.com → Account → Membership details → **Team ID**.

None of the three is a credential. Paste them into the chat and the change can
be made and committed in a minute.

## Step 4: signing certificates

Run from the repo:

```bash
eas build --platform ios --profile production
```

EAS asks to log in to Apple and then creates the distribution certificate and
provisioning profile by itself. There is nothing to generate by hand and no
keychain work, which is the one part of iOS release that used to be genuinely
painful.

**Two things stand in the way of this command right now:**

1. **It needs the Apple password and the 2FA code.** I do not enter credentials,
   so this step is yours. It is one prompt and one six-digit code.
2. **EAS project access.** The account `dinesh_doluweera` is not authorised on
   EAS project `61b5bfb4-812d-48c7-b136-0c29d9b3e182`, which currently answers
   `Entity not authorized: AppEntity[...], action = READ`. Gayan has to either
   add you to the project or move it into a `choner.io` organisation. **Ask him
   before starting step 4, not during it.**

## Step 5: first build to TestFlight

```bash
eas submit --platform ios --profile production
```

Then App Store Connect → TestFlight. The build sits in "Processing" for ten to
thirty minutes, then needs one answer about export compliance, which is already
pre-answered in the binary via `ITSAppUsesNonExemptEncryption: false`.

Internal testers (up to 100, anyone on the Apple account) need no review.
External testers (up to 10,000, by link) need a light review, usually a day.

**For the First 200, internal testers are the wrong tool** and external
TestFlight is the right one. Our testers are strangers from a park, not team
members.

## Step 6: what Apple needs before review

None of this blocks TestFlight. All of it blocks the actual store release, and
every item is slow enough that starting it late is how launch dates slip.

* **Screenshots.** Required: 6.9-inch iPhone. **And because
  `ios.supportsTablet` is `true` in app.json, Apple will also demand 13-inch
  iPad screenshots.** Two options: produce iPad screenshots, or set
  `supportsTablet: false` and ship iPhone-only. For an MVP, iPhone-only is the
  right answer and it is a one-line change. **Decide this before the first
  submission**, because flipping it afterwards is a new binary.
* **Description, keywords, subtitle, promotional text.**
* **Support URL and Privacy Policy URL.** Both must be live pages, not
  placeholders. Apple clicks them.
* **Age rating questionnaire.** Choner has user-to-user messaging and
  user-generated content, so answer honestly; getting this wrong is a rejection
  and a resubmission.
* **App Privacy ("nutrition labels").** A long form about what data we collect.
  It has to agree with what the app actually does, and with the privacy policy.
* **A demo account for the reviewer.** Choner is useless without signing in, so
  a reviewer who cannot get in will reject on guideline 2.1. Create a real
  account, with a commitment already running and ideally a partner, and put the
  email and password in the "Sign-In Required" box in App Review Information.
  **This is the single most common cause of a first-submission rejection.**

## The honest timeline

Apple's own review is one to three days for a first submission, and a rejection
costs a full round trip. TestFlight is same-day for internal testers.

So the useful sequence is: steps 1 to 5 this week, get a build on your own phone
through TestFlight, and run the step 6 paperwork in parallel with the fourteen
days of park work. The store submission is the last thing, not the first.

## Current state, 5 November 2026

* Apple Developer Program: **active since 27 October**.
* Bundle ID registered: **no**.
* App Store Connect record: **no**.
* `eas.json` placeholders filled: **no**, all three still `REPLACE_WITH_...`.
* iOS build ever produced: **no**. Every build so far is Android.
* Blocker to clear first: **EAS project access for `dinesh_doluweera`**.
