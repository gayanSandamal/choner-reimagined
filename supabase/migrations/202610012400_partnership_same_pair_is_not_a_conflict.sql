-- Pairing two people has been impossible since 202609301500. This fixes it.
--
-- A pairing is written as TWO updates to user_challenges, one per person
-- (accept_challenge_invite, confirm_match). Each fires
-- sync_partnership_from_challenge(), which inserts the pair's partnership row
-- with `on conflict (user_a, user_b) where state = 'active' do nothing`, so
-- the second update is meant to be a no-op.
--
-- It never got that far. check_partnership_one_per_person() is a BEFORE INSERT
-- trigger, so it runs ahead of the conflict check, and it asked "does either
-- of these people already have an active partnership?" without excluding the
-- row for THIS SAME PAIR, which the first update had just written. The second
-- update therefore raised "already in an active partnership" and the whole
-- transaction rolled back: the invite stayed pending, the match stayed
-- pending, and nobody was paired.
--
-- Not seen until 1 October because the live database had no pairings to make:
-- 0 partnerships, 0 matches. Found by pairing two people inside a rolled-back
-- transaction while testing the repair functions.
--
-- The rule is unchanged: one active partnership per person. A second row for
-- the same pair is not a second partnership, and the pair's own unique index
-- (partnerships_one_active) already makes it impossible.

create or replace function public.check_partnership_one_per_person()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.state <> 'active' then
    return new;
  end if;

  -- Lock both people in a fixed order (user_a < user_b) so two concurrent
  -- inserts touching the same person queue instead of both passing the check.
  perform pg_advisory_xact_lock(hashtextextended('partnership:' || new.user_a::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('partnership:' || new.user_b::text, 0));

  if exists (
    select 1 from public.partnerships p
    where p.state = 'active'
      and p.id <> new.id
      -- The same pair again is the idempotent second half of one pairing, and
      -- ON CONFLICT turns it into a no-op once this trigger lets it through.
      and not (p.user_a = new.user_a and p.user_b = new.user_b)
      and (p.user_a in (new.user_a, new.user_b) or p.user_b in (new.user_a, new.user_b))
  ) then
    raise exception 'already in an active partnership'
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.check_partnership_one_per_person() from public, anon, authenticated;
