-- A 6-character invite code, alongside the 36-character token.
--
-- Today the code IS `challenge_invites.token`, created at 202605240114:307 as
-- `encode(gen_random_bytes(18), 'hex')`. That is 36 hex characters, it only
-- ever appears inside the invite email, and it cannot be read out over the
-- phone, typed, or shown on a screen. The prototypes use `RUN4K7`: three
-- letters from the activity, then three characters.
--
-- The long token STAYS. It is the deep-link payload and it is unguessable; the
-- short code is the human path. Both resolve to the same invite.
--
-- Alphabet excludes the characters people get wrong reading a code aloud or
-- typing it: no O/0, no I/1, no L, no U (which also keeps the generator from
-- spelling things). Input is normalised, so lowercase and stray spaces or
-- dashes still work.
--
-- ALSO IN HERE, added 30 September: an unused invite expires after 48 hours.
-- That was decided in the Challenges review after the rest of this file was
-- written, and SCHEMA_CHALLENGES.md 6 says it lands here or in a follow-up.

-- ============================================================
-- 1. The column
-- ============================================================
alter table public.challenge_invites
  add column if not exists code text;

create unique index if not exists challenge_invites_code_key
  on public.challenge_invites (code)
  where code is not null;

comment on column public.challenge_invites.code is
  'Short human-typed code, e.g. RUN4K7: a 3-letter activity prefix plus 3 '
  'random characters. Resolves to the same invite as token, which stays as '
  'the deep-link payload.';

-- ============================================================
-- 2. Normalising what someone types
-- ============================================================
-- People type "run-4k7", "run 4k7" or "RUN4K7 ". All three are the same code.
create or replace function public.normalize_invite_code(p_code text)
returns text
language sql
immutable
as $$
  select nullif(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), '');
$$;

grant execute on function public.normalize_invite_code(text) to authenticated, anon;

-- ============================================================
-- 3. Generating one
-- ============================================================
-- The prefix comes from the template slug ('running' -> RUN, 'cycling' -> CYC).
-- A slug shorter than three letters, or a challenge with no template, falls
-- back to CHO rather than producing a short prefix.
create or replace function public.invite_code_prefix(p_user_challenge_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(upper(substring(regexp_replace(ct.slug, '[^a-zA-Z]', '', 'g') from 1 for 3)), ''),
    'CHO'
  )
  from public.user_challenges uc
  left join public.challenge_templates ct
    on ct.id = uc.challenge_template_id
  where uc.id = p_user_challenge_id;
$$;

create or replace function public.generate_invite_code(p_user_challenge_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  -- No O, 0, I, 1, L or U: the characters that get misread or mistyped.
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_prefix text := coalesce(public.invite_code_prefix(p_user_challenge_id), 'CHO');
  v_code text;
  v_try int := 0;
begin
  loop
    v_try := v_try + 1;
    v_code := v_prefix;
    for i in 1..3 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;

    -- 30^3 = 27,000 codes per prefix. Collisions are rare but not impossible,
    -- and the unique index is the real guard; this just picks again.
    exit when not exists (
      select 1 from public.challenge_invites where code = v_code
    );

    if v_try >= 50 then
      raise exception 'could not generate a free invite code for prefix %', v_prefix;
    end if;
  end loop;

  return v_code;
end;
$$;

grant execute on function public.generate_invite_code(uuid) to authenticated;

-- ============================================================
-- 4. Give the existing invites one
-- ============================================================
do $$
declare
  r record;
begin
  for r in
    select id, user_challenge_id
    from public.challenge_invites
    where code is null and status = 'pending'
  loop
    update public.challenge_invites
    set code = public.generate_invite_code(r.user_challenge_id)
    where id = r.id;
  end loop;
end $$;

-- New invites get one automatically, so nothing has to remember to call it.
create or replace function public.set_invite_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.code is null then
    new.code := public.generate_invite_code(new.user_challenge_id);
  end if;
  return new;
end;
$$;

drop trigger if exists challenge_invites_set_code on public.challenge_invites;
create trigger challenge_invites_set_code
  before insert on public.challenge_invites
  for each row execute function public.set_invite_code();

-- ============================================================
-- 5. An unused code expires after 48 hours
-- ============================================================
-- Decided in the Challenges review, after the rest of this file was written.
-- The check cannot live only in accept_invite_by_code: the deep link calls
-- accept_challenge_invite directly, so a trigger is the one place both paths
-- pass through.
alter table public.challenge_invites
  add column if not exists expires_at timestamptz;

comment on column public.challenge_invites.expires_at is
  'An unused invite expires 48 hours after it is created. Set on insert, not '
  'refreshed. Accepting past it is refused.';

-- Backfill, in two halves on purpose. Dating every existing row from its
-- created_at would retroactively expire every pending invite older than two
-- days - people who were sent a code last week would find it dead with no
-- warning and no way to tell why. New rule, so pending invites get the clock
-- started from NOW; anything already accepted or cancelled is dated from
-- created_at, where it is only a record.
update public.challenge_invites
set expires_at = now() + interval '48 hours'
where expires_at is null and status = 'pending';

update public.challenge_invites
set expires_at = created_at + interval '48 hours'
where expires_at is null;

alter table public.challenge_invites
  alter column expires_at set default (now() + interval '48 hours');

-- Refuse acceptance past it, whichever path got here.
create or replace function public.check_invite_not_expired()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted'
     and new.expires_at is not null and now() > new.expires_at then
    raise exception 'this invite code has expired';
  end if;
  return new;
end;
$$;

drop trigger if exists challenge_invites_expiry_gate on public.challenge_invites;
create trigger challenge_invites_expiry_gate
  before update on public.challenge_invites
  for each row execute function public.check_invite_not_expired();

-- ============================================================
-- 6. Accepting by either one
-- ============================================================
-- A thin wrapper rather than a rewrite: accept_challenge_invite has been
-- redefined eight times and its latest body (202608131600:527) carries the
-- single-challenge rules. Resolving the code to the token and delegating keeps
-- all of that in one place.
create or replace function public.accept_invite_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_input text := public.normalize_invite_code(p_code);
  v_token text;
begin
  if v_input is null then
    raise exception 'enter your invite code';
  end if;

  -- Either form. A pasted 36-character token still works here, so the one
  -- input on "Enter invite code" can take whatever the person has.
  select token into v_token
  from public.challenge_invites
  where code = v_input or token = p_code
  limit 1;

  if v_token is null then
    raise exception 'invite not found';
  end if;

  return public.accept_challenge_invite(v_token);
end;
$$;

grant execute on function public.accept_invite_by_code(text) to authenticated;

-- ============================================================
-- OPEN, needs a decision before the app uses this
-- ============================================================
-- What happens when someone who ALREADY HAS an active challenge enters a code?
-- End theirs, replace it, or block it? The recommendation was ask-then-replace,
-- and block outright if they are already partnered. It is not resolved here
-- and must not be resolved silently: accept_challenge_invite currently decides
-- for itself, and whatever we choose changes that function.
--
-- Also still to do, and NOT in this migration because it is a UI rule as much
-- as a data one: invite and search are one at a time. Starting one cancels the
-- other, with a confirm. Enforce it server-side too, or a race leaves someone
-- with two partners.
--
-- Done when: a 6-character code entered in the app joins the same challenge
-- the long link would have.
--
-- Verify:
--   select code, token, status, expires_at from public.challenge_invites order by created_at desc limit 5;
--   select public.normalize_invite_code(' run-4k7 ');  -- RUN4K7
