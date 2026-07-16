---
title: 'Animated Choner logo (Lottie) on welcome screen'
type: 'feature'
created: '2026-07-16'
status: 'done'
baseline_commit: 'e3bbf0d95bf51fd6da6299a6e4db27fd97168c9e'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The brand heart-orbit logo on the splash/welcome screen is static; the brand wants it to feel alive at first launch without distracting from the sign-in/sign-up CTAs.

**Approach:** Author a Lottie animation in code (clean vector shape layers rebuilt from the mark's parametric geometry — not the 290-path raster trace), play a one-time entrance then a subtle seamless loop of heartbeat pulse + a dot orbiting the ring, on the welcome screen only. Static logo remains the fallback for Reduce Motion.

## Boundaries & Constraints

**Always:**
- Install `lottie-react-native` via `npx expo install` so the SDK-54-pinned version is used (bundled in Expo Go — no dev build).
- Honor `useReduceMotion()` from `lib/motion`: when true, render the existing static `BrandLogo` and play nothing.
- Bundle the animation JSON locally in the repo; transparent background; brand orange `#FB7C05` to match the static mark.
- Loop must be seam-free: heart scale = 1 and orbiting dot at its home (top-right detached) position at both loop edges.

**Ask First:**
- Any change that would require a dev build or native config (expected: none).
- Any visible redesign of the mark's geometry beyond what animation requires.

**Never:**
- Don't animate the logo on sign-in/sign-up/forgot/reset/verify screens.
- Don't modify or delete `chonerMarkXml.ts`, `BrandLogo.tsx` (static), or `BrandMark.tsx` — they stay as-is for fallback and other screens.
- No remote/hosted Lottie assets; no extra animation libraries.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Welcome mounts, Reduce Motion off | Entrance (~0.6s fade/scale-in) plays once, then heartbeat + orbit loop indefinitely | N/A |
| Reduce Motion | OS Reduce Motion on | Static `BrandLogo` renders; no Lottie mounted | N/A |
| Loop boundary | Loop segment ends | `onAnimationFinish` replays loop segment; no visible jump | N/A |
| Web (dev preview) | Expo web | Animated if lottie web support works; otherwise platform-gated static `BrandLogo` | Must not crash; static fallback acceptable |
| Navigate away/back | Leave and return to welcome | Animation restarts cleanly (entrance again is acceptable) | N/A |

</frozen-after-approval>

## Code Map

- `components/auth/BrandLogo.tsx` -- static mark (SvgXml from trace); stays as Reduce Motion/web fallback
- `components/auth/chonerMarkXml.ts` -- traced artwork; reference for colors/bounds only
- `app/(auth)/welcome.tsx` -- renders `<BrandLogo size={170} />` inside a FadeInDown block; swap point
- `lib/motion.ts` -- `useReduceMotion()` context hook (wired in AppProvider)
- `components/auth/BrandLogo.tsx` @ git commit `e22f778^` -- parametric geometry source: heart bezier, ring ellipse (center 627.5,545; rx 316; ry 88; rot −16.57°), comma terminal, dot (888,364) in 1254-space, viewBox `300 310 660 480`
- `package.json` -- reanimated ~4.1.1 present; no lottie dep yet; no expo-dev-client (Expo Go)

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- `npx expo install lottie-react-native` -- SDK-pinned, Expo Go compatible
- [x] `assets/lottie/choner-logo.json` -- author Lottie (comp 660×480 @30fps): shape layers rebuilt from the parametric geometry — ring top-edge arc (behind), hollow heart stroke, ring bottom-edge + comma (front), orbiting dot layer placed *under* the heart stroke so it occludes naturally when passing behind. Frames 0–18: entrance (opacity 0→100, scale 92→100 on root). Frames 18–138 (4s loop): heart group double-beat scale pulse (≤6%, ease-out) + dot spatial keyframes once around the ring ellipse, returning to home -- core deliverable
- [x] `components/auth/AnimatedBrandLogo.tsx` -- new wrapper: `LottieView` (autoPlay once through entrance+loop, `onAnimationFinish` → `ref.play(18, 138)` to loop the subtle segment); `useReduceMotion()` or unsupported-web → render `<BrandLogo size={size} />`; `size` prop drives width, height from 660:480 aspect -- single integration surface
- [x] `app/(auth)/welcome.tsx` -- replace `BrandLogo` import/usage with `AnimatedBrandLogo` (same size/layout) -- scope limit: only this screen
- [x] `components/auth/AnimatedBrandLogo.web.tsx` -- platform fork added during implementation: `lottie-react-native`'s web renderer requires the optional `@lottiefiles/dotlottie-react` peer (not installed, out of spec scope); web now renders the static `BrandLogo` like the Reduce Motion path. iOS/Android use the animated version unaffected -- unplanned but required for the web dev-preview target named in the I/O matrix

**Acceptance Criteria:**
- Given Expo Go on iOS or Android, when the welcome screen opens, then the logo animates (entrance → subtle loop) with no dev build or native config change.
- Given any other auth screen (sign-in, sign-up, forgot, reset, verify), when it renders, then its logo/wordmark is unchanged and static.
- Given the loop plays ≥3 cycles, when observing the loop edges, then there is no visible jump in heart scale or dot position.
- Given `npm run typecheck`, `npm run lint`, and `npm test`, when run after implementation, then all pass.

## Design Notes

- Rebuild geometry from the pre-trace parametric `BrandLogo` (git `e22f778^`), scaled into the 660×480 comp (subtract viewBox origin 300,310). The traced SVG is visually canonical but unusable as Lottie source; the parametric mark was visually validated earlier and its ellipse gives exact orbit keyframes.
- Orbit: 12 spatial keyframes around the ellipse with smooth tangents (avoids Lottie group-scale squash tricks that distort the dot).
- The mark's detached dot IS the orbiter; it starts/ends each loop at its static home so freeze-frames match the brand mark.
- Author JSON by hand/script once and commit the static file; no runtime generation, no build-step generator in scope.

## Verification

**Commands:**
- `npm run typecheck` -- expected: exit 0
- `npm run lint` -- expected: exit 0
- `npm test` -- expected: existing suites pass (schemas untouched)

**Manual checks (if no CLI):**
- Expo web preview: welcome shows animated logo (or clean static fallback), no console errors, entrance plays once, loop is seamless.
- Expo Go device: same behavior; toggle OS Reduce Motion → static logo, no animation.

## Suggested Review Order

**Integration surface**

- Single behavior swap: static mark replaced with the animated wrapper, same size/layout.
  [`welcome.tsx:17`](../../app/(auth)/welcome.tsx#L17)

**Playback control (post-review fix: was `autoPlay` + competing entrance, now starts directly in the loop)**

- Loop bounds derived from the asset's own `op` field instead of hardcoded, so a regenerated JSON can't silently desync the loop point.
  [`AnimatedBrandLogo.tsx:18`](../../components/auth/AnimatedBrandLogo.tsx#L18)

- `onAnimationFinish` always resumes the loop regardless of `isCancelled` (backgrounding, interruption) — the earlier gated version could freeze permanently.
  [`AnimatedBrandLogo.tsx:26`](../../components/auth/AnimatedBrandLogo.tsx#L26)

- Playback starts at the loop segment via `ref.play()` on mount, not `autoPlay` from frame 0 — avoids stacking a second, uncoordinated entrance on top of the screen's existing Reanimated fade-in.
  [`AnimatedBrandLogo.tsx:30`](../../components/auth/AnimatedBrandLogo.tsx#L30)

- Box sized from the static mark's own aspect ratio, not the Lottie comp's padded canvas — keeps the box identical size when swapping to/from the Reduce Motion fallback.
  [`AnimatedBrandLogo.tsx:44`](../../components/auth/AnimatedBrandLogo.tsx#L44)

- Inner `LottieView` hidden from the accessibility tree so screen readers see only the outer labeled container, not a second unlabeled node.
  [`AnimatedBrandLogo.tsx:47`](../../components/auth/AnimatedBrandLogo.tsx#L47)

**Platform fallback**

- Reduce Motion / unsupported-web both render the exact static traced mark rather than any Lottie path.
  [`AnimatedBrandLogo.tsx:36`](../../components/auth/AnimatedBrandLogo.tsx#L36)
  [`AnimatedBrandLogo.web.tsx:9`](../../components/auth/AnimatedBrandLogo.web.tsx#L9)

**Animation asset**

- Heartbeat keyframes (double-beat, ease-out) live entirely inside the loop window so they replay every cycle.
  [`generate-choner-logo-lottie.mjs:117`](../../scripts/generate-choner-logo-lottie.mjs#L117)

- Dot orbit keyframes computed from the same tilted-ellipse geometry as the static mark's ring, so the animated path matches the drawn ring.
  [`generate-choner-logo-lottie.mjs:79`](../../scripts/generate-choner-logo-lottie.mjs#L79)

- Root layer is fully static (no baked-in entrance) — committed generator, re-run with `node scripts/generate-choner-logo-lottie.mjs assets/lottie/choner-logo.json` if the mark ever needs retuning.
  [`generate-choner-logo-lottie.mjs:145`](../../scripts/generate-choner-logo-lottie.mjs#L145)

**Peripherals**

- Shared prop type keeps the native and web components' signatures in sync.
  [`AnimatedBrandLogo.web.tsx:2`](../../components/auth/AnimatedBrandLogo.web.tsx#L2)
- New dependency, Expo-Go compatible (verified on-device).
  [`package.json`](../../package.json)
