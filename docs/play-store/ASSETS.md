# Google Play: the art that does not exist yet

Written 6 November 2026. Companion to [LISTING.md](LISTING.md), which has the
words. This file has the pictures, and the pictures are the long pole: the copy
can be pasted in an afternoon and the screenshots cannot, because four of the
six need a real matched pair on a real device.

Everything Play needs, in one table, then the detail.

| Asset | Size | Format | Max file size | Count | State |
|---|---|---|---|---|---|
| App icon | 1024 x 1024, exported to 512 x 512 | 32-bit PNG | 1 MB | 1, required | source exists |
| Feature graphic | 1024 x 500 | PNG or JPEG | 15 MB | 1, required | **does not exist** |
| Phone screenshots | 1080 x 1920 recommended | PNG or JPEG | 8 MB each | 2 minimum, 8 maximum, 6 recommended | **none exist** |
| 7-inch tablet screenshots | 1024 x 600 or taller | PNG or JPEG | 8 MB each | optional | skip |
| 10-inch tablet screenshots | 1920 x 1200 or taller | PNG or JPEG | 8 MB each | optional | skip |
| Promo video | a YouTube URL, not a file | n/a | n/a | optional | skip |

---

## App icon

**512 x 512 pixels, 32-bit PNG, under 1 MB.** This is the one asset with a
usable source already in the repo: `assets/icon.png` is 1024 x 1024, 8-bit RGB,
and is what the app itself ships. Export a 512 from it rather than drawing
anything new.

Four rules that catch people:

* **Do not round the corners and do not add a shadow.** Play applies its own
  mask and elevation. A pre-rounded icon ends up with a corner inside a corner.
* **Fill the full square.** No safe-area padding, unlike the Android adaptive
  icon, which is a separate thing already configured in `app.json` with a
  `#001827` background.
* **Keep it opaque.** Play accepts an alpha channel and then composites it on
  white, which is a different picture from the one you approved on a dark
  mockup. The existing source is already RGB with no alpha, so simply do not
  introduce one.
* **Check it at 48 pixels.** The decisions log has a note from 19 September
  about the traced `chonerMarkXml` logo having dark speckle fringes on light
  backgrounds. If the 512 export has any of that, it shows up as dirt at icon
  size in a list of apps. Look before uploading.

## Feature graphic

**1024 x 500 pixels, PNG or JPEG, under 15 MB, no transparency.** Required, and
there is no way around it: without a feature graphic the store listing cannot be
saved.

This is the banner at the top of the app page, and it is also what Play uses in
promotional placements where it gets cropped and overlaid. So:

* **Keep everything that matters inside the middle 70 percent.** Treat roughly
  150 pixels on the left and right as expendable. Play crops the sides on
  smaller layouts.
* **Leave the centre clear enough to survive a play button.** If a promo video
  is ever added, Play draws a play triangle dead centre over this image. Not a
  problem today, but do not put the wordmark exactly there.
* **No screenshots inside it, no device frames, no Play Store furniture.**
  Images that imitate Play's own UI, or that include a fake "Install" button or
  star ratings, get rejected.
* **No text that will need translating later**, or as little as possible. The
  feature graphic is per-language and a wordy one is five files instead of one.

What to actually draw, in the app's own language rather than a stock photo:
the white paper ground `#FDFCFB`, the wordmark `choner.` with the full stop in
`#FD8302`, one line of copy, and the orange gradient (`#FD8302` to `#FD5B01`)
doing the only loud thing in the frame. Poppins, the app's typeface. The
`og-cover.jpg` already produced for the First 200 landing page (1600 x 840,
`web/first-200/og-cover.jpg`) is the closest existing thing and its line, "What
if someone was counting on you to show up?", is a better feature graphic line
than anything written for the store. It is the wrong aspect ratio, so this is a
re-layout, not a crop.

## Phone screenshots

**Minimum 2, maximum 8. Six is the right number for Choner.** Format PNG or
JPEG, each file under 8 MB, each side between 320 and 3840 pixels, and the
aspect ratio between 16:9 and 9:16.

**Shoot at 1080 x 1920 portrait (9:16).** The app is portrait-locked
(`orientation: "portrait"` in `app.json`), so there is no landscape version to
produce and no reason to use a device with an odd ratio. A 1080 x 1920 frame is
what Play expects, what most phones produce, and what crops predictably.

Play shows the first two or three in the search result carousel without anyone
tapping into the listing, so **shot order is a copywriting decision, not a
cataloguing one.** The order below is deliberate: it tells the story in the same
sequence the product does.

### The six shots

**1. Find, with a match found.** The partner's photo and first name, the agreed
activity, and the accept action. This is the promise: one person, not a feed.
If only two screenshots ever get made, this is the first of them.
Screen: `app/(tabs)/find.tsx` in its `MatchOffer` or `MatchedCard` state.

**2. Home, paired and running.** The greeting, the shared heart, the
commitment, and its single next action. This is what the app looks like on a
normal Tuesday, which is the thing a screenshot set usually fails to show.
Screen: `app/(tabs)/home.tsx`.

**3. Planning the session.** The day, time and place being agreed, with the
partner's side visible and something still waiting on an answer. This is the
shot that proves it is two people and not a reminder app.
Screen: `app/plan/[challengeId].tsx`, the where or when step.

**4. Challenges, with a streak and a session owed.** The streak circle with
real days on it, and the owed session visible rather than a reset to zero. The
"you owe one rather than losing everything" idea is Choner's best mechanic and
nothing in the copy conveys it as fast as the picture.
Screen: `app/(tabs)/challenges.tsx`.

**5. The check-in photo trade.** Your photo sent, theirs revealed, with the
view-once and seven-day lines on screen. Proof and privacy in one frame.
Screen: the check-in step in `components/plans/steps/SessionSteps.tsx`.

**6. Community, your city.** A short feed of real milestone rows, first names
and what they did. Shows the thing is alive without promising a social network.
Screen: `app/(tabs)/community.tsx`.

If six is too many to produce, cut 5 and 6 in that order. Never cut 1 or 3.

### Captions, frames and styling

**Add a caption, do not add a device frame.** Play allows graphic overlays, and
a plain screenshot with no words makes a reader work out what they are looking
at. A device frame wastes about a fifth of the pixels and dates the image to
whatever handset was current.

The pattern that matches the design system: the screenshot on the white paper
ground `#FDFCFB`, one short line above it in `#1C2B33` Poppins with the
important word in `#FD5B01`, and nothing else. Six captions, one line each, no
em dashes:

1. One partner, not a feed of strangers.
2. Your commitment, and the one thing to do next.
3. Agree it together. Nothing is set until you both say yes.
4. Miss a day and you owe a session, not your whole streak.
5. Proof is a trade. Seen once, then gone.
6. See who else in your city showed up.

### Getting real content into the shots

This is the actual work, and it is why the screenshots cannot be done in an
hour.

* **Shots 1, 3, 4 and 5 need two accounts and a live pair.** Shot 3 needs one
  side of a negotiation to be unanswered, and shot 5 needs both photos sent. You
  cannot fake these from a single phone, and a placeholder screenshot that shows
  an empty state is worse than one fewer screenshot.
* **Use two real accounts on production**, and keep one of them. The reviewer
  demo account described in [LISTING.md](LISTING.md) needs exactly this state,
  so set it up once and use it for both jobs.
* **Do not run `npm run reset:challenges` to get a clean slate.** The decisions
  log flags it: it wipes everyone's check-ins on the shared database. Make new
  accounts instead.
* **Names and photos in the shots are real people's.** Use the founders' own, or
  get explicit permission. A stranger's face in a store screenshot is a problem
  that does not go away.
* **Turn the status bar into something sensible** before each capture. A 14
  percent battery and nine notification icons is the detail reviewers and users
  both notice.

## Tablets, and why to skip them

Play will show a note on the listing saying the app is not optimised for large
screens, and will rank it lower in tablet and Chromebook search. It will not
block the release. Android has no `supportsTablet` equivalent to decide here:
the app will install on a tablet either way, stretched.

**Skip tablet screenshots for the MVP.** This is the same call the Apple doc
makes for iPad, and for the same reason: producing them means designing for a
layout nobody is testing, and the First 200 are being recruited in a park with
phones in their hands. Revisit when there is a reason to.

---

## Needs Dinesh

**1. Who draws the feature graphic.** It is the only asset here that is design
work rather than capture work, it cannot be derived from anything in the repo,
and the listing cannot be saved without it. If it is going to an outside
designer, the brief is in the Feature graphic section above and the brief is
short enough to send today. If it is being done in-house, it is an afternoon.
Either way it is the first thing on this page that should start, because
everything else can be done the week of submission and this cannot.

**2. Whether to use the First 200 line as the store line.** "What if someone was
counting on you to show up?" is already written, already approved, and already
in use on `og-cover.jpg`. It is better than the short description in
[LISTING.md](LISTING.md), and it says nothing about habits, which is either a
feature or a problem depending on who the listing is talking to. Your call.

**3. Whose faces are in the screenshots.** Related to the two accounts above.
Worth deciding before capture rather than after, because reshooting a pair state
is more work than shooting it.

---

## Current state, 6 November 2026

* App icon: **source exists**, `assets/icon.png`, 1024 x 1024 PNG. Needs a 512
  export and a look at 48 pixels.
* Feature graphic: **does not exist.** Blocking. Nothing else on this page is.
* Phone screenshots: **none exist**, and four of the six need a live pair.
* Tablet screenshots: deliberately not doing.
* Promo video: deliberately not doing.
* Closest existing art: `web/first-200/og-cover.jpg` (1600 x 840) and
  `web/first-200/logo.png`. Neither is the right size for anything Play asks
  for.
