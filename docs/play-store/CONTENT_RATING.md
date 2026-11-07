# Google Play: the IARC content rating questionnaire

Written 6 November 2026. Play Console → Policy → App content → Content ratings.

Choner has user-to-user messaging, user-submitted photos, and a product whose
whole point is arranging for two strangers to meet in a park. Those three facts
decide every answer below. **A wrong answer here is not a rejection you argue
with: the rating is reissued, the listing is pulled from the regions that no
longer accept it, and repeated misdeclaration is an account-level problem.** So
the rule for this file is to answer what the app does, never what we would
prefer it did.

Two notes on how to use it:

* **The questionnaire's exact wording changes.** IARC revises it, and Play
  revises how it is presented. The answers below are grouped the way the
  questionnaire groups them and worded the way the questions are usually
  worded, but match them to what is on your screen rather than clicking
  through on the assumption they are identical.
* **The rating and the age restriction are two different mechanisms, and people
  confuse them.** This questionnaire produces a content rating (ESRB, PEGI, USK
  and the rest). The **Target audience and content** section, further down this
  file, is what actually restricts Choner to adults. Getting a low content
  rating does not mean the app will be shown to children, and it does not mean
  anything went wrong.

---

## Step 1: the email address and the category

**Email address.** `hello@choner.io`. IARC sends the rating certificate to it,
and it becomes the contact of record for the rating. Use the shared address, not
a personal one.

**Category.** The list Play offers is roughly: Reference, News or Educational;
Social Networking, Forums, Blogs and User-Generated Content; Utility,
Productivity, Communication or Other; Dating; Entertainment; Store or Shopping;
Simulated Gambling; Games.

**Answer: Utility, Productivity, Communication or Other.**

Why, and why the alternatives are wrong:

* **Not Social Networking / UGC.** Choner has no profiles to browse, no
  following, no post button, and no feed to act on. The Community tab is a
  read-only list of system-worded milestone lines, and the "also doing this"
  screen is explicitly view-only with no way to message or match from it. The
  social machinery exists to serve one pairing, not to be the product.
* **Not Dating, and this matters.** Choner matches strangers by area, activity
  and age band and then helps them agree to meet in person, which from the
  outside is the shape of a dating app. It is not one: there is one partner at a
  time, the match is tied to a commitment rather than to a person, there is no
  browsing, no swiping, no preference for who you are attracted to, and the
  chat closes when you meet. Picking Dating would be wrong on the facts and
  would also pull in Play's dating-app policies and a much higher rating.
* **Choosing "Utility" does not dodge the social questions.** The user
  interaction, location sharing and UGC questions are asked regardless of
  category. There is nothing to gain by miscategorising, which is the usual
  reason people do it.

---

## Step 2: Violence

| Question | Answer | Why |
|---|---|---|
| Does the app contain depictions of violence? | **No** | Nothing in the app depicts violence. The imagery is an hourglass, line icons, a streak circle and user photos of people exercising |
| Realistic or graphic violence, blood, gore? | **No** | |
| Violence towards or death of humans or animals? | **No** | |

These questions are about content the app itself provides. A user could
theoretically send anything in a photo or a chat message, and that risk is
answered by the user-generated content questions in Step 6, not here. Answering
"yes" to violence because a user could hypothetically send a violent photo is a
misreading and would rate the app far higher than it is.

## Step 3: Sexuality

| Question | Answer | Why |
|---|---|---|
| Does the app contain nudity or sexual content? | **No** | |
| Sexual innuendo, references to sexual activity? | **No** | |
| Does the app facilitate romantic or sexual connections? | **No** | Matching is on activity, area, time of day and age band. There is no attraction preference anywhere in the product and the category is not Dating. See Step 1 |

Worth having ready if anyone asks about the photos: check-in photos are
camera-only with no gallery picker, visible to one partner, seen once, and
deleted as soon as they have been seen and in every case within seven days.
That is a narrower surface than almost any photo-sharing app, and the report
route reaches a human.

## Step 4: Language

| Question | Answer | Why |
|---|---|---|
| Does the app contain profanity or crude humour? | **No** | Every string in the app is written copy, reviewed, and clean. There is no generated text and no AI in the build |

Again: the chat is user text and belongs to Step 6.

## Step 5: Controlled substances

| Question | Answer | Why |
|---|---|---|
| Does the app contain references to alcohol, tobacco or drugs? | **No** | |
| Does it facilitate their purchase? | **No** | |

The health disclaimer users agree to at sign-up is about exercise risk and is
not a substance reference.

## Step 6: Miscellaneous, and the part that actually matters

This is where Choner's real answers are. Everything above is "no" and nobody
will query it. These are the ones to get right.

### Users can interact with each other

**Yes.** Not arguable, and do not try.

What exists: a time-boxed free-text chat between two matched partners
(`meetup_messages`, `components/plans/MeetupChat.tsx`), which opens when both
say they are at the meeting place and disables at the QR scan; a fixed opener
and three canned replies before that; a typed meeting-place suggestion each
person can accept or counter; a shared session plan both have to agree; a
partner nudge; a check-in photo sent to one person; and a one-tap reaction to a
milestone in the city feed.

### Users can share their physical location with each other

**Yes.** This is the answer most likely to be got wrong, because the instinct
is to say no on the grounds that the app never touches GPS.

The app genuinely does not read device location: no location permission is
declared, `expo-location` is not a dependency, and the area a user picks comes
from a fixed list of 70 Colombo neighbourhoods they choose by hand. **And it
does not matter.** Two users type, negotiate and agree a specific meeting place
and a specific time, and then each tells the other when they are on their way
and when they have arrived. Whatever the mechanism, one user ends up knowing
where another user will physically be. Answering "no" to this question for an
app that arranges in-person meetups is the kind of answer that gets a rating
revoked.

**Answer yes, and if there is a free-text field, say that the location is a
place the users agree by hand and that the app never reads the device
position.** That is both true and the more favourable framing.

### Users can share personal information with each other

**Yes.** A partner sees your first name, your photo if you added one, the
activity you both agreed, your area and whether you showed up. The chat is free
text, so a user can type whatever they like.

The mitigation, worth describing if there is room: phone numbers, email
addresses, links and social handles are **rejected before sending**, checked
both in the app (`features/plans/chat-filter.ts`) and in the database
(`meetup_message_problem()`), with the safety line "For your safety, keep the
conversation in the app and hold off on sharing personal details" shown on
every screen the chat appears on. A partner never sees your email address, your
full name unless you used it as your name, or your reasons for starting.

### The app contains user-generated content

**Yes.** Chat messages, the typed meeting place, check-in photos, profile
photos, names, the reason given for a missed day, and the milestone a user
chooses to share to their city feed.

Play's user-generated content policy wants three things, and all three exist:

* **An in-app reporting system.** `app/modals/report.tsx`, reachable from Match
  Found, from the partner menu, and from inside the chat itself. Six categories
  (`features/safety/rules.ts`): didn't show up, made me uncomfortable,
  inappropriate behaviour or messages, safety concern at a meetup, fake profile,
  something else. Before a pair has met, only the two categories that can
  actually be true are offered.
* **Blocking.** `user_blocks`, which also guarantees the two are never matched
  again.
* **Moderation.** A founder reads every report. A report ends the match
  immediately and the reported person is never told who reported them or why,
  only that the match has ended.

If the questionnaire asks whether the UGC is **moderated**, the honest answer is
**yes, reactively and by a human**, not pre-moderated. Say that rather than
claiming pre-moderation: there are two founders and no automated moderation
beyond the chat filter. Reactive human review is what Play's policy asks for.

### Digital purchases

**No**, for this build.

There is no purchase path: `features.pro` defaults to false
(`constants/features.ts`), which hides the paywall app-wide, and
`configurePurchases()` returns early because the production build sets no
RevenueCat key. Also answer "no" to in-app purchases in Store settings so the
two agree.

**This answer expires the day Pro ships.** A new purchase path means re-answering
this questionnaire, which reissues the rating. Worth knowing before anyone
treats the paywall as a quiet toggle.

### Gambling, ads, and unrestricted internet

| Question | Answer | Why |
|---|---|---|
| Simulated or real gambling? | **No** | |
| Does the app display ads? | **No** | No ads SDK, no advertising ID, nothing to serve |
| Does the app allow unrestricted internet access or browsing? | **No** | No in-app browser and no WebView. `react-native-webview` is not a dependency. Links to the privacy policy and terms are in-app screens |
| Does the app share user location with the developer? | **Yes, the area** | The chosen neighbourhood and a city derived from the device timezone are stored server-side. Matches the Data safety declaration, which is the thing that must agree |

---

## Step 7: the interactive elements Play will derive

Play turns the Step 6 answers into the badges shown on the store page. Expect:

* **Users Interact** (from the chat and the shared plan).
* **Shares Location** (from the agreed meeting place).
* **No** Digital Purchases, for now.
* **No** Unrestricted Internet.

Those badges are the correct outcome and not something to try to avoid.
"Users Interact" and "Shares Location" on a store listing are honest signals
about an app that pairs strangers to meet in person, and a listing that lacks
them while the app does both is the problem.

---

## The separate section: Target audience and content

Play Console → Policy → App content → Target audience and content. **This is
the control that actually restricts Choner to adults, not the content rating.**

| Question | Answer | Why |
|---|---|---|
| Target age groups | **18 and over, only** | The terms of service require it ("You need to be 18 or over"), the privacy policy says it, the lowest age band in onboarding is 18 to 24, and the product arranges in-person meetups between strangers |
| Is your app designed for children? | **No** | |
| Could your store listing unintentionally appeal to children? | **No** | The icon, the feature graphic brief and the description are all written for adults, with no cartoon characters, no bright play imagery and no game language |

**Tick no age group under 18.** Including even 16-17 pulls Choner into Play's
Families policy, which brings a separate set of requirements that an app
pairing strangers for in-person meetings is not going to meet and should not
try to.

**One honest gap, not a blocker.** Nothing in the app verifies age. The terms
say 18 or over, and the lowest onboarding band is 18 to 24, which works as a
soft gate because there is no younger option to pick. Play does not require an
age-assurance mechanism for an app declared 18+ with no under-18 target group,
so this is sufficient to file. It is worth knowing that it is a declaration and
a soft gate rather than a check, because that is exactly the question a Sri
Lankan regulator or a worried parent would ask.

---

## What rating to expect

**No promises, and nothing here should be read as one.** IARC issues a separate
rating per region and the algorithm is not published. For an app with no
violence, no sexual content, no profanity, no substances and no gambling, but
with user interaction, location sharing and user-generated content, a low
content rating with interactive-element disclaimers is the normal outcome: often
an ESRB Everyone or Teen and a PEGI 3 or PEGI 12, depending on how the
interaction questions are weighted that month.

**If the rating comes back lower than feels right, nothing is wrong.** The
content rating describes the content, which really is mild. The 18+ target
audience declaration is what keeps the app away from minors, and it does that
independently.

**Submit the questionnaire early.** It takes about fifteen minutes, it is free,
it can be re-answered, and an unanswered content rating blocks the release. It
is the cheapest green tick on the App content page and there is no reason for it
to be the last one done.

---

## Needs Dinesh

**1. The category, if you disagree.** I have answered Utility, Productivity,
Communication or Other, and argued it above. The counter-argument is real:
Choner matches people, has a chat, and has a city feed, and someone could call
that Social Networking without being unreasonable. It changes little, because
the social questions get asked either way. Say so if you want it changed before
it is filed rather than after.

**2. Whether "not a dating app" is a position or a disclaimer.** The listing
copy says it outright and this file argues it to the rating authority. If the
plan ever includes letting people choose who they are matched with on anything
other than activity, area, time and age band, then both of those statements stop
being true and both have to change. Worth saying out loud once, now, rather than
discovering it in a feature review.

**3. Nothing else.** Every other answer on this page is a fact about the build
and none of them is yours to decide.

---

## Current state, 6 November 2026

* Content rating questionnaire: **not started.**
* Target audience and content: **not filed.**
* In-app reporting, blocking and human review: **all exist and ship**, which is
  why the UGC answers are comfortable rather than nervous.
* The one thing that changes these answers: shipping Pro, which turns Digital
  Purchases to yes and requires the questionnaire to be re-answered.
