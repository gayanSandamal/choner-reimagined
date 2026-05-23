# Architecture

## Frontend
- Expo + React Native + Expo Router
- Feature folders for auth, challenges, community, insights, profile
- Reusable UI components in `components/ui`
- State:
  - React Query for server/cache state
  - lightweight local store if needed with Zustand

## Backend
- Supabase
  - auth
  - postgres
  - storage
  - realtime
  - edge functions
  - row level security

## Major domains
- profiles
- challenge_templates
- user_challenges
- challenge_tasks
- task_checkins
- groups
- group_members
- invites
- ai_recommendations
- notifications
- premium_entitlements

## Edge functions
- invite-email: sends challenge invitations through Resend
- ai-coach: turns profile + challenge history into next-step guidance
- daily-recovery: optional scheduled nudges / streak risk recovery

## Navigation
- auth stack
- onboarding
- main tabs
  - home
  - challenges
  - community
  - insights
  - profile
- modal routes
  - ai coach
  - notifications
  - premium
  - settings
