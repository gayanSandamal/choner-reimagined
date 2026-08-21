-- Wipe every account, then seed 500 sample users into the partner pool.
--
-- DESTRUCTIVE AND IRREVERSIBLE. Every auth.users row goes, including yours.
--
-- WHY NOT `supabase db reset`
--
-- Because app_config holds service_role_key and functions_base_url, and those
-- rows are inserted out-of-band over the service-role API rather than by any
-- migration. A reset would empty that table, both cron sweeps would start
-- logging "config missing, nothing sent" every hour, and it would look exactly
-- like the bug we just spent a day fixing. This wipes accounts and leaves
-- configuration, templates and cron jobs alone.
--
-- WHY THE DELETE ORDER MATTERS
--
-- Almost everything hangs off auth.users with ON DELETE CASCADE, so one delete
-- would do it -- except challenge_invites.invited_by and groups.created_by,
-- which are NO ACTION and will abort the whole delete instead. They go first.
-- analytics_events is ON DELETE SET NULL, so it survives the cascade as
-- orphaned rows carrying a null user; it gets truncated rather than left.
--
-- Storage objects are emptied by the wrapper over the Storage API, because
-- Supabase blocks direct deletes from storage.objects.

\set ON_ERROR_STOP on

-- :wipe and :count are supplied by the wrapper. Top-up mode (wipe=false) adds
-- people to the existing pool instead of replacing everybody, which is how you
-- refill after auto-matching has drained it.
\if :wipe
\echo 'MODE: wipe and reseed'
\else
\echo 'MODE: top up (no accounts deleted)'
\endif

begin;

-- psql does NOT substitute :variables inside a dollar-quoted block, so the
-- count is handed to the do-block as a session setting instead of as :count.
select set_config('choner.seed_count', :'count', false);
select set_config('choner.seed_anchors', :'anchors', false);

-- ============================================================
-- 1. Wipe  (skipped entirely in top-up mode)
-- ============================================================
\if :wipe
delete from public.challenge_invites;   -- NO ACTION: blocks the cascade
delete from public.groups;              -- NO ACTION: blocks the cascade
truncate public.analytics_events;       -- SET NULL: would survive as orphans

delete from auth.users;                 -- cascades the other 30-odd tables
\endif

-- Storage is NOT handled here. storage.protect_delete() rejects direct deletes
-- from storage.objects ("Use the Storage API instead") to stop rows being
-- removed while the underlying files stay behind. The wrapper script empties
-- the buckets over the Storage API before calling this file.

-- ============================================================
-- 2. Seed
-- ============================================================
do $$
declare
  -- Reproducible: same seed, same 500 people. Makes a re-run diffable instead
  -- of a fresh roll of the dice every time.
  c_password constant text := 'ChonerTest123!';
  c_count    constant int  := current_setting('choner.seed_count')::int;

  first_names constant text[] := array[
    'Nimal','Kamal','Saman','Ruwan','Chamara','Dilhan','Kasun','Tharindu','Sanjaya','Isuru',
    'Amaya','Nethmi','Sachini','Dilini','Hiruni','Tharushi','Ishara','Nadeesha','Piumi','Gayathri',
    'Arjun','Priya','Rohan','Meera','Vikram','Ananya','Karthik','Divya','Rahul','Shreya',
    'Wei','Mei','Jun','Hana','Aiko','Daniel','Sarah','Michael','Emma','James',
    'Olivia','Noah','Ava','Liam','Sophia','Ethan','Isabella','Lucas','Mia','Omar'
  ];
  last_names constant text[] := array[
    'Perera','Fernando','Silva','Jayawardena','Gunasekara','Bandara','Wickramasinghe','Rajapaksa',
    'Dissanayake','Herath','Senanayake','Ratnayake','Amarasinghe','Weerasinghe','Kumara',
    'Sharma','Patel','Nair','Reddy','Iyer','Chen','Tan','Lim','Wong','Ng',
    'Smith','Johnson','Brown','Taylor','Anderson','Hassan','Ali','Khan','Farah','Osman'
  ];

  -- Weighted toward Sri Lanka so there is a dense, genuinely matchable cohort
  -- in the tester's own timezone, with enough spread to exercise the timezone
  -- proximity score (which drops to zero past a 5-hour gap).
  places constant text[][] := array[
    array['Asia/Colombo','Colombo'], array['Asia/Colombo','Kandy'],
    array['Asia/Colombo','Galle'],   array['Asia/Colombo','Negombo'],
    array['Asia/Colombo','Jaffna'],  array['Asia/Colombo','Matara'],
    array['Asia/Kolkata','Chennai'], array['Asia/Kolkata','Bengaluru'],
    array['Asia/Karachi','Karachi'], array['Asia/Dhaka','Dhaka'],
    array['Asia/Singapore','Singapore'], array['Asia/Dubai','Dubai'],
    array['Europe/London','London'], array['America/New_York','New York'],
    array['Australia/Sydney','Sydney']
  ];

  tones constant text[] := array['competitive','momentum','encouraging','team'];
  goals constant text[] := array['move_more','sleep_better','reduce_stress','improve_energy'];
  struggles constant text[] := array['start_but_stop','lack_accountability','too_busy','overwhelmed'];
  stress constant text[] := array['low','medium','high'];

  -- Long enough that four of them clear the 200-character bar the length
  -- component of commitmentSignal saturates at.
  purpose_texts constant text[] := array[
    'I want to stop being the person who starts things and quietly drops them by week two',
    'My father had a heart attack at fifty-two and I am not walking the same road he did',
    'I have been saying I will get fit since 2023 and I am tired of hearing myself say it',
    'I want my mornings back instead of losing them to a phone and a snooze button'
  ];
  matters_texts constant text[] := array[
    'My sister gets married in November and I would like to feel good in the photographs',
    'I tried this twice before and stopped both times around day four, which is the part I want to beat',
    'My daughter copies everything I do and right now she is copying the wrong things',
    'I have a health check in six weeks and I would rather not be told off again'
  ];
  gain_texts constant text[] := array[
    'Enough energy that the evening is not just me collapsing on a sofa',
    'The quiet confidence of being someone who actually finishes what they start',
    'Sleep that works, because everything else gets easier when that one is fixed',
    'A body that can keep up with my kids on a weekend without me needing a lie down'
  ];
  lose_texts constant text[] := array[
    'Another year of the same promise, which is starting to feel like a personality trait',
    'The three weeks of progress I already put in, which I refuse to hand back',
    'My own trust in myself, and that one is much harder to earn back than fitness',
    'The chance to prove that I am not actually the person who gives up'
  ];

  purpose_keys constant text[] := array['healthier_routine','prove_consistency','feel_better'];
  matters_keys constant text[] := array['upcoming_event','tried_before','someone_inspired'];
  gain_keys    constant text[] := array['more_energy','better_health','confidence'];
  lose_keys    constant text[] := array['another_failed_attempt','lost_progress','lost_proof'];

  templates uuid[];
  durations int[];
  titles text[];
  n_templates int;

  i int;
  v_offset int;
  v_uid uuid;
  v_email text;
  v_name text;
  v_place int;
  v_tz text;
  v_city text;
  v_template uuid;
  v_duration int;
  v_title text;
  v_challenge uuid;
  v_task uuid;
  v_joined timestamptz;
  v_tier int;
  v_deadline time;
begin
  select array_agg(id order by sort_order, created_at),
         array_agg(duration_days order by sort_order, created_at),
         array_agg(title order by sort_order, created_at)
    into templates, durations, titles
  from public.challenge_templates where is_active;

  n_templates := array_length(templates, 1);
  if n_templates is null or n_templates = 0 then
    raise exception 'no active challenge_templates to seed against';
  end if;

  -- Carry on from the highest sampleNNN already present, so a top-up cannot
  -- collide with an existing account and the emails stay readable.
  select coalesce(max((substring(email from '^sample([0-9]+)@'))::int), 0)
    into v_offset
  from auth.users where email ~ '^sample[0-9]+@choner\.test$';

  for i in (v_offset + 1)..(v_offset + c_count) loop
    v_uid := gen_random_uuid();
    v_email := 'sample' || lpad(i::text, 3, '0') || '@choner.test';
    v_name := first_names[1 + (i * 7) % array_length(first_names, 1)]
              || ' ' ||
              last_names[1 + (i * 13) % array_length(last_names, 1)];

    -- About 60% land in Sri Lanka (rows 1-6), the rest spread outward.
    --
    -- Two-subscript indexing because `places` is a 2-D array, and Postgres does
    -- not treat those as arrays of arrays: places[n] on a 2-D array is NULL,
    -- not the nth row. places[n][1] is how you reach an element.
    if abs(hashtext('place' || i::text)) % 10 < 6 then
      v_place := 1 + abs(hashtext('sl' || i::text)) % 6;
    else
      v_place := 7 + abs(hashtext('intl' || i::text)) % 9;
    end if;
    v_tz := places[v_place][1];
    v_city := places[v_place][2];

    -- Round-robin so every active template carries a usable cohort; the hard
    -- rule requires an identical template, so a thin one is an unmatchable one.
    v_template := templates[1 + (i % n_templates)];
    v_duration := durations[1 + (i % n_templates)];
    v_title := titles[1 + (i % n_templates)];

    -- Spread over the last five days so the fairness weighting (which kicks in
    -- after 48h in the pool) has something real to rank on.
    v_joined := now() - make_interval(mins => (i * 37) % 7200);
    v_deadline := (array['18:00','19:00','20:00','21:00'])[1 + abs(hashtext('dl' || i::text)) % 4]::time;

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, extensions.crypt(c_password, extensions.gen_salt('bf')),
      v_joined, v_joined, now(), v_joined,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_name),
      '', '', '', ''
    );

    -- Empty strings rather than nulls on the token columns above: GoTrue
    -- compares them directly on some paths and a null quietly fails to match.

    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_uid::text, v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      'email', v_joined, v_joined, now()
    );

    -- profiles already exists: on_auth_user_created inserted it with full_name.
    update public.profiles set
      full_name = v_name,
      timezone = v_tz,
      city = v_city,
      daily_deadline = v_deadline,
      accountability_mode = tones[1 + abs(hashtext('tone' || i::text)) % 4],
      primary_goal = goals[1 + (i % 4)],
      main_struggle = struggles[1 + (i % 4)],
      stress_level = stress[1 + (i % 3)],
      onboarding_complete = true,
      created_at = v_joined
    where id = v_uid;

    insert into public.user_challenges (
      user_id, challenge_template_id, accountability_mode, status,
      started_at, ends_at, partner_state
    ) values (
      v_uid, v_template, 'solo', 'active',
      v_joined, v_joined + make_interval(days => v_duration), 'finding'
    ) returning id into v_challenge;

    insert into public.challenge_tasks (user_challenge_id, title, sort_order, due_window)
    values (v_challenge, v_title, 1, 'anytime') returning id into v_task;

    -- Commitment tiers. matchPool scores for productive ASYMMETRY -- it wants
    -- one anchor and one person who needs anchoring, and penalises two low
    -- signals by 40 points. A pool that was uniformly keen would score badly
    -- across the board and mostly refuse to pair, so the spread is the point.
    --
    --   0  anchor    100  four answers, all four in their own words
    --   1  strong      90  four answers, three written
    --   2  middling    50  four answers, one written
    --   3  light       33  three answers, one short line
    --   4  minimal     19  three quick-selects, nothing written
    --
    -- Hashed rather than `i % 5`, and this matters more than it looks. The
    -- template is assigned round-robin as i % 15, and 5 divides 15 -- so a
    -- plain i % 5 would hand every user doing a given habit the SAME tier.
    -- Since the matcher hard-rules out pairing across different habits, every
    -- candidate pair would then have had identical commitment signals, and
    -- productive asymmetry -- the entire hypothesis the algorithm is built on
    -- -- could never occur. The first run of this seed did exactly that: 146
    -- pairs, every one of them "no clear anchor".
    -- :anchors restricts the mix to tiers 0-2 (signals 100 / 90 / 50), all of
    -- which clear the commitment floor and can therefore anchor somebody.
    --
    -- This matters because of an asymmetry that is easy to miss: a low-signal
    -- person is only matchable via an anchor, an anchor gets consumed by the
    -- first low-signal person it is paired with, and two low-signal people can
    -- NEVER pair (the -40 both-low penalty caps them at 25 against a floor of
    -- 45). So a uniform 5-tier top-up adds 2 unmatchable people for every 3
    -- anchors and the pool trends toward permanent gridlock. Refills are
    -- anchors only.
    if current_setting('choner.seed_anchors') = 'true' then
      v_tier := abs(hashtext('tier' || i::text)) % 3;
    else
      v_tier := abs(hashtext('tier' || i::text)) % 5;
    end if;

    insert into public.challenge_reflections (user_id, user_challenge_id, question_key, choice_key, custom_text)
    values (v_uid, v_challenge, 'purpose',
            case when v_tier <= 1 then 'something_else' else purpose_keys[1 + (i % 3)] end,
            case when v_tier <= 2 then purpose_texts[1 + (i % 4)] else null end);

    insert into public.challenge_reflections (user_id, user_challenge_id, question_key, choice_key, custom_text)
    values (v_uid, v_challenge, 'matters',
            case when v_tier = 0 then 'something_else' else matters_keys[1 + (i % 3)] end,
            case when v_tier <= 1 then matters_texts[1 + (i % 4)]
                 when v_tier = 3 then 'Tried before, stopped.' else null end);

    if v_tier <= 3 then
      insert into public.challenge_reflections (user_id, user_challenge_id, question_key, choice_key, custom_text)
      values (v_uid, v_challenge, 'gain',
              case when v_tier = 0 then 'something_else' else gain_keys[1 + (i % 3)] end,
              case when v_tier <= 1 then gain_texts[1 + (i % 4)] else null end);
    end if;

    if v_tier <= 2 then
      insert into public.challenge_reflections (user_id, user_challenge_id, question_key, choice_key, custom_text)
      values (v_uid, v_challenge, 'lose',
              case when v_tier = 0 then 'something_else' else lose_keys[1 + (i % 3)] end,
              case when v_tier = 0 then lose_texts[1 + (i % 4)] else null end);
    end if;

    if v_tier = 4 then
      insert into public.challenge_reflections (user_id, user_challenge_id, question_key, choice_key, custom_text)
      values (v_uid, v_challenge, 'gain', gain_keys[1 + (i % 3)], null);
    end if;

    insert into public.partner_match_requests (
      user_id, user_challenge_id, challenge_template_id, timezone, status, created_at, updated_at
    ) values (
      v_uid, v_challenge, v_template, v_tz, 'waiting', v_joined, v_joined
    );

    -- Some of them have been logging. Gives the Challenges tab and any future
    -- streak surface something real, and stops every sample account looking
    -- like it signed up and never came back.
    if i % 3 = 0 then
      insert into public.task_checkins (challenge_task_id, user_challenge_id, status, completed_at)
      select v_task, v_challenge, 'completed', (v_joined + make_interval(days => d))
      from generate_series(0, least(v_duration - 1, (i % 4))) as d
      where (v_joined + make_interval(days => d)) < now();
    end if;
  end loop;

  raise notice 'seeded % sample users (sample% .. sample%), password %',
    c_count, lpad((v_offset + 1)::text, 3, '0'),
    lpad((v_offset + c_count)::text, 3, '0'), c_password;
end $$;

commit;
