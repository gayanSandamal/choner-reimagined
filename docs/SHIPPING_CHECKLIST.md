# Shipping Checklist

Status legend: ✅ done in code · 🔑 needs a real key/secret · 🎨 needs an asset · 👤 needs a person/process.

## Product
- ✅ Onboarding flow (with stress level question)
- ✅ Empty / loading / error states across all screens (`components/ui/StateViews.tsx`)
- ✅ Premium gates wired (`useIsPremium` reads from `subscriptions` table)
- ✅ Forgot password, reset password, email verification screens
- ✅ Profile edit with avatar upload (Supabase Storage bucket `avatars`)
- ✅ Group create / detail / posts / comments / reactions / reporting
- ✅ Notification preferences screen
- ✅ Legal screens (privacy, terms, health disclaimer)
- 👤 Final copy review (legal, AI coach system prompt, store listings)
- 👤 Health advisor review of challenge templates

## Engineering
- ✅ Supabase schema for production data layer (`supabase/migrations/202605240114_production_data.sql`)
- ✅ Real `get_user_insights` RPC (no more hardcoded numbers)
- ✅ Push token persistence into `user_devices`
- ✅ Realtime subscriptions for notifications + subscriptions
- ✅ Edge functions: `ai-coach` (OpenAI), `revenuecat-webhook`, `send-push`
- ✅ Sentry + PostHog wired (`lib/observability.ts`)
- ✅ Error boundary at root (`components/ErrorBoundary.tsx`)
- ✅ Account deletion RPC (`delete_account()`) + UI in Settings
- ✅ Jest + one test suite + GitHub Actions CI
- 🔑 Set Supabase secrets: `OPENAI_API_KEY`, `REVENUECAT_WEBHOOK_AUTH`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- 🔑 Mobile env: `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`, `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`
- 🔑 Create Supabase Storage bucket `avatars` (public read) and run all migrations on the prod project
- 🔑 `eas credentials` — APNs key + FCM v1 service account
- 👤 RLS device-by-device QA with two real test users
- 👤 Device QA on iOS + Android

## Trust / Legal
- ✅ In-app privacy policy
- ✅ In-app terms of service
- ✅ Health disclaimer (in app + injected into AI coach system prompt)
- ✅ Consent checkbox on sign-up (terms + privacy + health disclaimer)
- 👤 Hosted privacy policy + terms at choner.app (App Store metadata requires public URLs)
- 👤 Data retention written policy

## Launch Ops
- ✅ `eas.json` build profiles for dev/staging/production with env separation
- ✅ `eas.json` submit section populated with placeholders to fill in
- ✅ `app.json` plugins for notifications, image-picker, secure-store, Sentry
- 🎨 Replace placeholder asset paths in `app.json` with real icons + splash + notification icon
- 🔑 ASC API key + Apple Team ID; Play service account JSON
- 👤 App Store + Play Store listings (screenshots, descriptions, age rating)
- 👤 Support email + marketing site
- 👤 Admin dashboards (Supabase Studio + Sentry + PostHog suffice for v1)

## Recommended additions before launch
- More tests: RLS smoke tests, billing entitlement gate, AI coach context builder
- Detox or Maestro for one end-to-end flow
- App Store subscription review (RevenueCat sandbox → TestFlight → review)
- Content moderation tooling (Supabase Studio dashboard query for `reports` table)
