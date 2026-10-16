# Google and Apple sign-in

**Status: not started. Deliberately parked until the App Store review window.**
Decided 16 October 2026.

## Why it is parked rather than dropped

87% of the First 200 waitlist is on Gmail, and one registration in eight has
already been lost to a mistyped domain. One-tap sign-in removes typos
completely and arrives pre-verified, so `link_first_200()` fires instantly and
the person lands already recognised. It is the right answer.

It is not the right answer *this week*, because it needs `eas credentials`
finished first (for the Android SHA-1) and it moves all testing off Expo Go
onto development builds. Two to three working days, landing on a release date
that has no slack. The email typo checker shipped instead (`features/auth/
email-typo.ts`), which catches most of the same failure for half an hour of
work and no new accounts.

**The window to build it is while Apple is reviewing the first submission.**
There is genuine dead time there, nothing else can progress, and if it slips it
slips into 1.1 rather than into the launch.

## What already exists

Someone started this and stopped. Dead code today, useful tomorrow:

- `features/auth/api.ts` → `signInWithAppleIdentityToken()`. Written, exchanges
  the identity token with Supabase. **Called by nothing.**
- `components/auth/SocialButton.tsx`. Written, handles google/facebook/apple.
  **Used nowhere.**
- `app.json` → `ios.usesAppleSignIn: true`. Already set.

Not installed: `expo-apple-authentication`,
`@react-native-google-signin/google-signin`.

Production today: 885 accounts, every one email and password, **zero social
identities**.

## The work

### Google
1. A Google Cloud project.
2. Three OAuth client IDs: **Web** (the one Supabase and `webClientId` need),
   **iOS** (bundle `com.choner.app`), **Android** (package `com.choner.app`
   plus the **SHA-1 of the signing certificate**).
3. The SHA-1 comes from `eas credentials`, so **this is blocked behind the
   release plumbing, not parallel to it.**
4. Supabase → Authentication → Providers → Google: enable, paste the IDs.
5. Native call → id token → `supabase.auth.signInWithIdToken({ provider:
   'google', token })`. A `signInWithGoogleIdToken()` beside the Apple one.

### Apple
6. Apple Developer → Identifiers → enable Sign In with Apple on
   `com.choner.app`.
7. Create a **Services ID** and a **signing key**; download the `.p8`.
8. Supabase → Providers → Apple: Services ID, Team ID, Key ID, private key.
9. `expo-apple-authentication`, native call, then the bridge that already
   exists.

### App
10. Wire `SocialButton` into sign-in and sign-up.
11. `getProfile()` already creates a missing profile row on demand, so the
    social path does not need its own upsert.

## Four things that will bite

**Apple gives the full name exactly ONCE**, on the very first authorization,
and never again. Capture and store it in that callback or that person has no
name for ever.

**Hide My Email.** Apple users may hand over
`xyz@privaterelay.appleid.com`. That will **never** match a First 200
registration, so those people arrive unrecognised and still need the code
screen (`app/profile/code.tsx`). The feature that removes typos reintroduces
the same failure for a subset of users.

**Guideline 4.8.** Ship Google and Apple sign-in becomes mandatory on iOS. They
are one decision, not two.

**Expo Go stops working** for auth testing. Both are native modules, so the
whole loop moves to development builds.

## Done looks like

Someone can sign up on either platform without typing an address, lands
verified, and a First 200 member who used Google is recognised the moment they
arrive. A Private Relay user is offered the code screen instead of being left
to wonder.
