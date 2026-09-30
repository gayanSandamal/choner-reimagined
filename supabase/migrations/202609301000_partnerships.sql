-- SCHEMA_CHALLENGES.md §2: a partnership that outlives the challenge.
--
-- Until now a partner was two columns on user_challenges, so the partnership
-- died with the challenge row. Ending a challenge must NOT end the match.
--
-- EXPAND phase, deliberately. About eight functions write
-- user_challenges.partner_state / partner_user_id (confirm_match, invite
-- accept, block, report, ...). Rewriting all of them in one migration is how a
-- safety path gets broken, so instead a trigger mirrors those columns into
-- partnerships. The columns stay the write path for now; once every writer
-- calls the new table directly, stop writing them (the contract step, a later
-- migration, not this one).
--
-- partner_state is left alone: solo/finding/invited/matched are per-challenge
-- SEARCH states. An active partnerships row is what 'partnered' means.

-- ============================================================
-- 1. The table
-- ============================================================

create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  -- Ordered pair, least() first, so one pair is one row.
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  state text not null default 'active' check (state in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references auth.users(id) on delete set null,
  -- Private. Nothing partner-facing may return it (§5).
  end_reason text check (end_reason is null or end_reason in (
    'no_time_worked', 'stopped_replying', 'pace_mismatch',
    'changing_what_i_do', 'something_felt_off', 'prefer_not_to_say'
  )),
  constraint partnerships_ordered check (user_a < user_b),
  constraint partnerships_ended_has_time check (state = 'active' or ended_at is not null)
);

-- One live partnership per pair. NOT one per person: multi-challenge
-- (202609182000) lets a person be paired differently per challenge, and this
-- migration does not decide that they can't. See the PR description.
create unique index if not exists partnerships_one_active
  on public.partnerships (user_a, user_b)
  where state = 'active';
create index if not exists partnerships_user_a_idx on public.partnerships (user_a, state);
create index if not exists partnerships_user_b_idx on public.partnerships (user_b, state);

-- RLS on, no policies: like pair_plans, every read goes through a function
-- that answers relative to auth.uid(), so end_reason cannot leak by accident.
alter table public.partnerships enable row level security;

-- ============================================================
-- 2. Backfill
-- ============================================================

insert into public.partnerships (user_a, user_b, started_at)
select least(uc.user_id, uc.partner_user_id),
       greatest(uc.user_id, uc.partner_user_id),
       coalesce(min(uc.started_at), now())
from public.user_challenges uc
where uc.partner_state = 'partnered'
  and uc.partner_user_id is not null
  and uc.partner_user_id <> uc.user_id
group by 1, 2
on conflict do nothing;

-- ============================================================
-- 3. Keep it in step with the old columns
-- ============================================================

create or replace function public.sync_partnership_from_challenge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_partner uuid;
begin
  -- Became (or is) partnered: make sure the pair has a live partnership.
  if new.partner_state = 'partnered'
     and new.partner_user_id is not null
     and new.partner_user_id <> new.user_id then
    insert into public.partnerships (user_a, user_b)
    values (least(new.user_id, new.partner_user_id),
            greatest(new.user_id, new.partner_user_id))
    on conflict do nothing;
  end if;

  -- Stopped being partnered with someone: end that partnership, but only when
  -- no OTHER challenge still pairs the same two people.
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

-- Deliberately no DELETE branch: deleting a challenge row is not ending the
-- match (§2, decided 29 Sept).
drop trigger if exists user_challenges_sync_partnership on public.user_challenges;
create trigger user_challenges_sync_partnership
  after insert or update of partner_state, partner_user_id on public.user_challenges
  for each row execute function public.sync_partnership_from_challenge();

-- ============================================================
-- 4. Repoint is_partner_of()
-- ============================================================

-- Refuse to repoint if the backfill missed anyone: this function guards
-- check-in photo storage RLS, so a silent gap is a broken photo for a real
-- pair. Fails the whole migration rather than shipping that.
do $$
declare
  v_missing int;
begin
  select count(*) into v_missing
  from public.user_challenges uc
  where uc.partner_state = 'partnered'
    and uc.partner_user_id is not null
    and not exists (
      select 1 from public.partnerships p
      where p.state = 'active'
        and p.user_a = least(uc.user_id, uc.partner_user_id)
        and p.user_b = greatest(uc.user_id, uc.partner_user_id)
    );
  if v_missing > 0 then
    raise exception 'partnerships backfill incomplete: % partnered challenge(s) have no active partnership', v_missing;
  end if;
end $$;

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
       select 1 from public.partnerships p
       where p.state = 'active'
         and p.user_a = least(p_a, p_b)
         and p.user_b = greatest(p_a, p_b)
     );
$$;
