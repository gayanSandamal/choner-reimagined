-- SCHEMA_CHALLENGES.md §2: one ACTIVE partnership per person.
--
-- Not a new rule: it falls out of "one active challenge per user" and "a circle
-- only fills when both people complete the session". With two partners the
-- model cannot say which "both", and the shared count stops meaning anything.
--
-- 202609301000 only had unique (user_a, user_b) where active, which stops the
-- same PAIR having two live rows and nothing else: one person could hold four
-- partnerships.
--
-- Three guards, and the trigger is not optional:
--
--   1. (user_a, user_b)  the pair            -- already exists
--   2. (user_a)          one as the lesser   -- below
--   3. (user_b)          one as the greater  -- below
--
-- Because the pair is stored ordered (user_a < user_b), 2 and 3 stop the same
-- person appearing twice on the SAME side. They do NOT stop the cross-side
-- case: X as user_a in (X, Y) and as user_b in (W, X) with W < X < Y passes all
-- three. A unique index cannot span two columns like that, so a trigger closes
-- it, serialised per person with an advisory lock so two concurrent matches
-- cannot both pass the check.

create unique index if not exists partnerships_one_active_as_a
  on public.partnerships (user_a) where state = 'active';
create unique index if not exists partnerships_one_active_as_b
  on public.partnerships (user_b) where state = 'active';

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
      and (p.user_a in (new.user_a, new.user_b) or p.user_b in (new.user_a, new.user_b))
  ) then
    raise exception 'already in an active partnership'
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.check_partnership_one_per_person() from public, anon, authenticated;

drop trigger if exists partnerships_one_per_person on public.partnerships;
create trigger partnerships_one_per_person
  before insert or update of state, user_a, user_b on public.partnerships
  for each row execute function public.check_partnership_one_per_person();

-- The sync trigger from 202609301000 used a bare `on conflict do nothing`.
-- That swallows ANY unique violation, including the new one-per-person ones, so
-- someone already partnered being paired with a second person would leave a
-- partnered challenge with NO partnership row, silently, and is_partner_of()
-- would say false. Name the conflict target: only "this pair is already
-- active" is a no-op. A second partner now raises, which is the point.
create or replace function public.sync_partnership_from_challenge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_partner uuid;
begin
  if new.partner_state = 'partnered'
     and new.partner_user_id is not null
     and new.partner_user_id <> new.user_id then
    insert into public.partnerships (user_a, user_b)
    values (least(new.user_id, new.partner_user_id),
            greatest(new.user_id, new.partner_user_id))
    on conflict (user_a, user_b) where state = 'active' do nothing;
  end if;

  if tg_op = 'UPDATE'
     and old.partner_state = 'partnered'
     and old.partner_user_id is not null
     and (new.partner_state is distinct from 'partnered'
          or new.partner_user_id is distinct from old.partner_user_id) then
    v_old_partner := old.partner_user_id;

    if not exists (
      select 1 from public.user_challenges uc
      where uc.id <> new.id
        and uc.partner_state = 'partnered'
        and ((uc.user_id = new.user_id and uc.partner_user_id = v_old_partner)
          or (uc.user_id = v_old_partner and uc.partner_user_id = new.user_id))
    ) then
      update public.partnerships
      set state = 'ended', ended_at = now()
      where user_a = least(new.user_id, v_old_partner)
        and user_b = greatest(new.user_id, v_old_partner)
        and state = 'active';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_partnership_from_challenge() from public, anon, authenticated;
