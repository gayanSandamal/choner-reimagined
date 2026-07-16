# Deferred Work

Append-only log of issues surfaced during quick-dev reviews that are real but out of scope for the story that found them.

- source_spec: `_bmad-output/implementation-artifacts/spec-lottie-logo-animation.md`
  summary: `AppProvider`'s `reduceMotion` state seeds `false` and only corrects itself after an async `AccessibilityInfo.isReduceMotionEnabled()` resolves, so on cold launch a Reduce-Motion user can briefly see a motion-gated component (e.g. `AnimatedBrandLogo`) animate before it swaps to its static fallback.
  evidence: Confirmed by reading `providers/app-provider.tsx:94-103` — `useState(false)` followed by a `.then()` callback with no synchronous initial value. Every component reading `ReduceMotionContext` (not just the new animated logo) has this same brief-flash characteristic; fixing it means changing the shared provider's seeding strategy app-wide, not something one story should do incidentally.

- source_spec: `_bmad-output/implementation-artifacts/spec-lottie-logo-animation.md`
  summary: No bundled asset in the app (Lottie JSON, images, etc.) has a load/parse-failure fallback; if `assets/lottie/choner-logo.json` were ever corrupted (e.g. a bad OTA transfer), `AnimatedBrandLogo` would likely render blank space instead of falling back to the static `BrandLogo`.
  evidence: Raised by adversarial review of the Lottie logo diff, but the same risk applies equally to every other `require()`'d local asset in the codebase, and there's no existing resilience pattern here to extend for just one component.
