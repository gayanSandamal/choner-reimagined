# Choner Mobile App — Advanced Product Foundation

This package is an **advanced near-production foundation** for Choner using:

- **Expo React Native** for iOS + Android
- **Supabase** for auth, database, storage, realtime, and Edge Functions
- **Resend** for transactional email

## Included

- polished Expo Router app structure
- email/password auth and session handling
- onboarding with goal, struggle, lifestyle, and accountability preferences
- home, challenges, community, insights, notifications, premium, profile, settings
- reusable design system components
- challenge templates, daily check-in flow, streak and milestone cards
- community group and invite flow
- notification registration scaffolding
- AI coach API/edge function placeholders
- Supabase SQL schema with RLS policies
- Resend invite email edge function
- accountability matching RPC/function stubs
- shipping checklist and architecture notes

## Important truth

This is a **serious production-grade foundation**, but no one can honestly claim a mobile app is fully shipped without:

- real Supabase project keys
- QA across devices
- accessibility pass
- content/legal/privacy review
- push notification certificates
- analytics wiring
- store assets and store submissions
- production monitoring and incident handling

This package gets you **very close to product build-out**, not magical instant App Store release.

## Quick start

```bash
npm install
cp .env.example .env
npm run start
```

## Supabase setup

1. Create a Supabase project
2. Run the migration in `supabase/migrations/20250324_polished.sql`
3. Deploy edge functions:
   - `invite-email`
   - `ai-coach`
4. Set secrets:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`

## Recommended next steps

1. connect the app to your real Supabase project
2. replace demo assets and copy with brand content
3. wire the AI coach edge function to your chosen LLM
4. add production analytics
5. configure push notifications and EAS build profiles
6. QA and submit to stores

See `docs/SHIPPING_CHECKLIST.md`.
