-- is_partner_of() only ever checked challenge_invites acceptance. Pairs formed
-- through matchmaking (confirm_match) never write an invite row - per
-- sweep_missed_checkins()'s own comment, "concierge-matched partners never
-- have an invite row at all - confirm_match writes partner_user_id directly."
-- Matchmaking is the primary onboarding path today, so this silently returned
-- false for most partnered pairs - breaking checkin_photos_owner_or_partner_read
-- storage RLS and daily_status's partner-read policy for anyone matched rather
-- than invited. This is a live bug fix, not just prep for the pair timeline.
--
-- user_challenges.partner_user_id/partner_state is the linkage get_partner_status
-- and sweep_missed_checkins already treat as the source of truth, and the
-- invite-accept path also writes it symmetrically (202608131600_partner_path_
-- single_challenge.sql), so this is a strict superset of the old check, not a
-- narrowing.
create or replace function public.is_partner_of(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_a is not null
     and p_b is not null
     and p_a <> p_b
     and exists (
       select 1 from public.user_challenges uc
       where uc.user_id = p_a
         and uc.partner_user_id = p_b
         and uc.partner_state = 'partnered'
     );
$$;
