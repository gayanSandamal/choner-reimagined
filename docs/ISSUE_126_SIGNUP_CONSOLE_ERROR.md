# #126 — "fetch failed … The network connection was lost" on sign up

**Reported:** once, on iOS, in Expo dev, on the create-account screen.
**Verdict:** the error named in the issue is **environmental and harmless**.
Two genuine faults were found next to it and have been fixed.

```
Error: fetch failed: UnexpectedException: The network connection was lost.
  (at ExpoModulesCore/Promise.swift:56)
```

## Why the named error is not a bug

`ExpoModulesCore/Promise.swift` means the rejection came out of a **native Expo
module**, not from JavaScript. Supabase does not qualify: `lib/supabase.ts`
passes no custom `fetch`, so it uses React Native's own networking and its
failures do not surface through a Swift promise. A search for `expo/fetch`,
`globalThis.fetch` and `global.fetch` across the repo returns nothing.

The only call on the sign-up path that crosses a native Expo module is
`lib/notifications.ts:150`:

```ts
Notifications.getExpoPushTokenAsync({ projectId })
```

It contacts Expo's push service, and it is fired from
`providers/app-provider.tsx:107-116` the moment a session appears — un-awaited,
inside an IIFE whose `catch {}` is bare and deliberate ("push isn't required to
use the app"). So the failure is caught, nothing downstream depends on it, and
the only trace is the console line.

That matches the report exactly: it happened **once**, nothing visibly failed,
and the stack bottoms out in `reactConsoleErrorHandler`.

**Most likely cause:** the Metro dev server connection dropping, which is
routine on a phone on wifi. The call is not retried because a push token is not
needed to sign up.

**Not worth "fixing".** Swallowing the log would hide a real push failure
later; retrying would add a timer to a path that does not need one. If it
becomes noisy in testing, the honest change is to downgrade that one `catch` to
a `console.info`, not to chase the network.

## Two real faults found while tracing it

Both sit on the same path and both were capable of producing an error with no
visible cause. These are fixed.

### 1. An unhandled rejection every time the app came to the foreground

`providers/session-provider.tsx` — the `AppState` → `active` listener called
`supabase.auth.getSession().then(...)` with **no `.catch`**, and the
`validateStoredSession()` inside it was itself async, un-awaited and uncaught.

Any network failure there was an unhandled promise rejection. The timing is
the interesting part: this fires exactly when iOS **dismisses the
push-permission dialog**, which is the same moment the push-token call above
runs. So one dropped connection could produce two console errors from
different places, which is what makes this kind of report hard to read.

Now caught. A failed check simply waits for the next foreground.

### 2. `restore()` could strand the app on the splash screen

Same file. `restore()` had no `try/catch`, and `setLoading(false)` was only
reached on its success paths. A throw from `supabase.auth.getSession()` on
boot — a cold start with no connectivity — meant `loading` stayed `true`
forever, with nothing else to clear it.

Now `setLoading(false)` runs in a `finally`, so every exit clears it.

### 3. Sign-up could create an account and then tell you it failed

`features/auth/api.ts` — after `supabase.auth.signUp` succeeded **with** a
session, a failing `profiles` upsert was thrown. The screen caught it and
showed "Sign up failed" to someone whose account had already been created and
who was already signed in. Their natural next move, submitting again, then hit
**"That email already has an account"** — a dead end with no way forward.

Nothing was actually at stake: `on_auth_user_created` (`202605241200`) already
inserts the profile row and reads `full_name` from `raw_user_meta_data`, which
is the same `options.data` the sign-up call passes. The upsert is belt and
braces. It now logs and carries on.

## What to watch

If the console line reappears, it is worth noting **what else was happening**:
a Metro reconnect, a backgrounded app returning, or airplane mode. If it ever
appears with a *user-visible* failure attached, that is a different bug and
worth a new issue — this one is specifically about a log line with no
consequence.
