-- The First 200 — pre-launch registrations.
--
-- Lives in the app's own project, not a separate one, because on launch day a
-- registration has to join to a real auth.users row. A second project would
-- make that a manual export at the worst possible moment.
--
-- NOT in profiles: profiles.id is a foreign key to auth.users, and these people
-- have no account yet. This is its own table, and claim_prelaunch() below is
-- the bridge between the two.
--
-- See docs/FIRST_200_BUILD_SPEC.md.

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- The human-readable code: F2-XXXXXX
--
-- Same alphabet as the app's partner invite codes (no I, L, O, 0 or 1, which
-- are the characters people mishear and mistype). The F2- prefix exists
-- because the app's invite code is ALSO six characters from this alphabet, and
-- without a visible difference people will paste one into the other's field.
--
-- random() is fine here: this is the fallback people read aloud, and claiming
-- it requires an account first (see claim_prelaunch), so guessing costs a
-- signup per attempt. The claim_token, which travels in links, uses
-- gen_random_bytes instead.
-- ---------------------------------------------------------------------------
create or replace function public.gen_access_code()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text; i int;
begin
  loop
    code := 'F2-';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.prelaunch_registrations where access_code = code);
  end loop;
  return code;
end $$;

-- ---------------------------------------------------------------------------
-- One row per person
-- ---------------------------------------------------------------------------
create table if not exists public.prelaunch_registrations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  full_name   text not null,
  email       citext not null unique,
  phone       text,          -- E.164, optional; consent_contact must cover it

  -- The quiz, in the app's own vocabulary (features/onboarding/constants.ts),
  -- so nothing has to be translated when these answers reach a profile.
  -- Nullable: the step-1 save carries a name and an email and nothing else,
  -- because the goal question moved to its own screen. A row with no goal is
  -- someone who left after step 1, and that is still a lead worth keeping.
  primary_goal   text check (primary_goal in
                   ('move_more','sleep_better','reduce_stress','improve_energy')),
  main_struggle  text check (main_struggle in
                   ('start_but_stop','lack_accountability','too_busy','overwhelmed')),
  age_range      text check (age_range in ('18-24','25-34','35-44','45-54','55+')),
  gender         text check (gender in ('male','female','prefer_not_to_say')),

  -- The fields that decide whether a match is possible at all, rather than
  -- merely how well it scores. hardBlock() in features/challenges/matching.ts.
  mode         text check (mode in ('together','separate','either')),

  -- Multi-select, unlike the app's single time_of_day. matching.ts:358 blocks
  -- an in-person pair whose slots differ, and someone who can do mornings OR
  -- evenings is matchable with both camps. Narrowed to one slot at claim time.
  times_of_day text[] not null default '{}',

  location     text references public.locations(value),  -- Colombo area slug
  district     text,                                      -- elsewhere in SL

  -- The six ACTIVE templates. The app's own constraint also permits
  -- 'badminton', whose template is is_active = false (202610020900), so it is
  -- refused here rather than accepted and then unmatchable.
  activity_key text check (activity_key in
                 ('running','jogging','walking','cycling','yoga','home_workouts')),

  -- Up to four, Workouts only. text[] to match user_challenges.exercises,
  -- which is free text by design (202610011050).
  exercises text[] not null default '{}',

  -- Identity. The token is secret and goes in links; the code is spoken aloud.
  claim_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  access_code text not null unique default public.gen_access_code(),

  referred_by uuid references public.prelaunch_registrations(id),

  -- consent_contact is a real consent: being emailed or called is a purpose
  -- of its own and they tick a box for it.
  --
  -- consent_match is NOT a consent, despite the name. Matching is the service
  -- they came to the page for, so it runs on that basis rather than a tickbox
  -- that nobody could sensibly decline. Asking for consent you would not
  -- honour a refusal of is worse than not asking. What this records is that
  -- the row was completed on the step that carries the matching notice, which
  -- is the transparency obligation that does apply.
  consent_contact boolean not null default false,
  consent_match   boolean not null default false,

  -- The launch handshake
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,

  -- The form posts twice (once after step 1 so an abandon still leaves a
  -- lead, once at the end), so this is what stops two welcome emails.
  welcome_sent_at timestamptz,

  source text,   -- 'whatsapp', 'running_club', ... read from ?src=
  notes  text,   -- yours, for manual matching

  -- AT MOST one, not exactly one: the step-1 save has neither yet.
  constraint one_place check (num_nonnulls(location, district) <= 1),
  constraint times_valid check (
    times_of_day <@ array['early_morning','morning','afternoon','evening','night']),
  constraint exercises_cap check (cardinality(exercises) <= 4),
  constraint exercises_only_workouts check (
    cardinality(exercises) = 0 or activity_key = 'home_workouts')
);

create index if not exists prelaunch_match_idx
  on public.prelaunch_registrations (activity_key, mode, location);
create index if not exists prelaunch_created_idx
  on public.prelaunch_registrations (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: on, with NO policies. That is the design, not an omission.
--
-- The anon key ships inside the page's JavaScript. An insert policy alone is
-- not enough, because reading back the new row's code needs select as well —
-- and a select policy on this table makes every registrant's email, phone,
-- age, gender and area publicly downloadable, along with every claim token.
-- With no policies, only service_role touches the table, and everything goes
-- through the security-definer functions below.
-- ---------------------------------------------------------------------------
alter table public.prelaunch_registrations enable row level security;

-- ---------------------------------------------------------------------------
-- The only way in
-- ---------------------------------------------------------------------------
create or replace function public.register_prelaunch(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ref uuid; v_code text; v_token text; v_send boolean;
begin
  -- The honeypot: a field hidden from people and filled in by bots. Report
  -- success so it believes the job is done and does not come back.
  if coalesce(p->>'website','') <> '' then
    return jsonb_build_object('ok', true, 'access_code', 'F2-XXXXXX',
                              'claim_token', '', 'should_send_welcome', false);
  end if;

  if nullif(p->>'ref','') is not null then
    select id into v_ref from prelaunch_registrations where claim_token = p->>'ref';
  end if;

  insert into prelaunch_registrations (
    full_name, email, phone, primary_goal, main_struggle, age_range, gender,
    mode, times_of_day, location, district, activity_key, exercises,
    consent_contact, consent_match, referred_by, source
  ) values (
    nullif(trim(p->>'full_name'),''),
    lower(trim(p->>'email')),
    nullif(trim(p->>'phone'),''),
    p->>'primary_goal', p->>'main_struggle', p->>'age_range', p->>'gender',
    p->>'mode',
    coalesce(array(select jsonb_array_elements_text(p->'times_of_day')), '{}'),
    nullif(p->>'location',''), nullif(p->>'district',''),
    p->>'activity_key',
    coalesce(array(select jsonb_array_elements_text(p->'exercises')), '{}'),
    coalesce((p->>'consent_contact')::boolean, false),
    coalesce((p->>'consent_match')::boolean, false),
    v_ref, nullif(p->>'source','')
  )
  -- EVERY FIELD COALESCES against what is already stored. The form saves twice,
  -- and someone who comes back and re-does step 1 must not have their finished
  -- answers wiped by a payload that simply does not carry them yet.
  on conflict (email) do update set
    full_name       = coalesce(nullif(excluded.full_name,''), prelaunch_registrations.full_name),
    phone           = coalesce(excluded.phone,         prelaunch_registrations.phone),
    primary_goal    = coalesce(excluded.primary_goal,  prelaunch_registrations.primary_goal),
    main_struggle   = coalesce(excluded.main_struggle, prelaunch_registrations.main_struggle),
    age_range       = coalesce(excluded.age_range,     prelaunch_registrations.age_range),
    gender          = coalesce(excluded.gender,        prelaunch_registrations.gender),
    mode            = coalesce(excluded.mode,          prelaunch_registrations.mode),
    times_of_day    = case when cardinality(excluded.times_of_day) > 0
                           then excluded.times_of_day
                           else prelaunch_registrations.times_of_day end,
    location        = coalesce(excluded.location,      prelaunch_registrations.location),
    district        = coalesce(excluded.district,      prelaunch_registrations.district),
    activity_key    = coalesce(excluded.activity_key,  prelaunch_registrations.activity_key),
    exercises       = case when cardinality(excluded.exercises) > 0
                           then excluded.exercises
                           else prelaunch_registrations.exercises end,
    -- Consent only ever moves from false to true, and only by being given.
    consent_contact = prelaunch_registrations.consent_contact or excluded.consent_contact,
    consent_match   = prelaunch_registrations.consent_match   or excluded.consent_match,
    referred_by     = coalesce(prelaunch_registrations.referred_by, excluded.referred_by),
    source          = coalesce(prelaunch_registrations.source, excluded.source)
  returning access_code, claim_token,
            (activity_key is not null and welcome_sent_at is null)
    into v_code, v_token, v_send;

  return jsonb_build_object('ok', true, 'access_code', v_code,
                            'claim_token', v_token, 'should_send_welcome', v_send);
end $$;

revoke all on function public.register_prelaunch(jsonb) from public;

-- Called by the Edge Function only after Resend accepts the message, so a
-- failed send leaves welcome_sent_at null and the next save retries it.
create or replace function public.mark_welcome_sent(p_token text)
returns void language sql security definer set search_path = public as $$
  update prelaunch_registrations set welcome_sent_at = now()
   where claim_token = p_token and welcome_sent_at is null;
$$;

revoke all on function public.mark_welcome_sent(text) from public;

-- Count only. A public counter must never be a select policy — this returns a
-- number and nothing else.
create or replace function public.prelaunch_count()
returns int language sql security definer set search_path = public
as $$ select count(*)::int from prelaunch_registrations $$;

revoke all on function public.prelaunch_count() from public;
grant execute on function public.prelaunch_count() to anon;

-- ---------------------------------------------------------------------------
-- Launch day
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_first_200 boolean not null default false;

create or replace function public.claim_prelaunch(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.prelaunch_registrations;
begin
  -- Requiring an account IS the rate limit: brute-forcing six characters
  -- costs a signup per attempt.
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into r from prelaunch_registrations
   where access_code = upper(trim(p_code))
      or claim_token = trim(p_code);

  if r.id is null             then raise exception 'code_not_found'; end if;
  if r.claimed_by is not null then raise exception 'code_already_claimed'; end if;

  update prelaunch_registrations
     set claimed_by = auth.uid(), claimed_at = now()
   where id = r.id;

  update profiles set is_first_200 = true where id = auth.uid();

  return jsonb_build_object('ok', true, 'first_name', split_part(r.full_name, ' ', 1));
end $$;

revoke all on function public.claim_prelaunch(text) from public;
grant execute on function public.claim_prelaunch(text) to authenticated;

comment on table public.prelaunch_registrations is
  'The First 200. Written only by register_prelaunch() from the Edge Function; '
  'RLS is on with no policies, so nothing reads it but service_role.';

-- ---------------------------------------------------------------------------
-- The handshake that does not depend on anyone keeping a code
--
-- They registered with an email. They sign up with an email. If those match,
-- there is nothing for the person to remember, type or lose — so the link is
-- made automatically and the code becomes the fallback for someone who signs
-- up with a different address.
--
-- ON VERIFICATION, NOT ON SIGNUP. auth.users gains its row the moment someone
-- submits the form, before they have proved the address is theirs. Linking
-- there would let anyone type a registrant's email into signup and claim
-- their place — the account would be unusable without the confirmation link,
-- but the registration would be marked claimed and the real person locked
-- out. Waiting for email_confirmed_at closes that.
--
-- The INSERT arm covers a project with email confirmation switched off, where
-- email_confirmed_at is already set on the first row.
-- ---------------------------------------------------------------------------
create or replace function public.link_first_200()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_hit boolean;
begin
  update public.prelaunch_registrations
     set claimed_by = new.id, claimed_at = now()
   where email = new.email::citext
     and claimed_by is null;

  get diagnostics v_hit = row_count;

  if v_hit then
    -- Upsert rather than update: this trigger and the one that creates the
    -- profile both fire on the same row, and nothing should depend on which
    -- of them Postgres runs first.
    insert into public.profiles (id, is_first_200) values (new.id, true)
    on conflict (id) do update set is_first_200 = true;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_first_200 on auth.users;
create trigger on_auth_user_first_200
  after insert or update of email_confirmed_at on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.link_first_200();

-- Anyone already registered before this landed.
update public.prelaunch_registrations r
   set claimed_by = u.id, claimed_at = now()
  from auth.users u
 where r.email = u.email::citext
   and u.email_confirmed_at is not null
   and r.claimed_by is null;

update public.profiles p set is_first_200 = true
  from public.prelaunch_registrations r
 where r.claimed_by = p.id and p.is_first_200 = false;
