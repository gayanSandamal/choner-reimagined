-- Security review, 17 November 2026. Some functions run with full database
-- rights and never checked who called them, and the public app key could call
-- them without signing in:
--   get_match_pool          names, ages, genders and answers of everyone waiting
--   create_partner_match    a match between any two people
--   get_user_insights(_series)  anyone's streak and completion numbers
--   ensure/start_user_challenge a challenge on someone else's account
-- The server-only ones are now server-only. The two the app calls directly
-- check that the caller is the account being changed.

-- 1. Server only: the matcher, cron and the First 200 sign-up call these with
--    the service key. Nothing in the app does.
do $$
declare f text;
begin
  foreach f in array array[
    'public.create_partner_match(uuid,uuid,uuid,text,text,uuid,numeric,integer,integer,jsonb)',
    'public.get_match_pool(uuid)',
    'public.expire_stale_invites()',
    'public.get_user_insights(uuid)',
    'public.get_user_insights_series(uuid,integer)',
    'public.mark_welcome_sent(text)',
    'public.register_prelaunch(jsonb)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- 2. Signed-in only (used inside other functions, never needed signed out).
revoke execute on function public.generate_invite_code(uuid) from public, anon;
revoke execute on function public.invite_code_prefix(uuid) from public, anon;
grant execute on function public.generate_invite_code(uuid) to authenticated, service_role;
grant execute on function public.invite_code_prefix(uuid) to authenticated, service_role;

-- 3. ensure_user_challenge. confirm_match calls it for BOTH people in a match,
--    so the unchecked version lives on as ensure_user_challenge_internal for
--    server-side callers, and the public name checks the caller.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.ensure_user_challenge(uuid,uuid,text,boolean)'::regprocedure);
  d := replace(d, 'FUNCTION public.ensure_user_challenge(', 'FUNCTION public.ensure_user_challenge_internal(');
  execute d;

  d := pg_get_functiondef('public.confirm_match(uuid)'::regprocedure);
  if position('ensure_user_challenge(' in d) = 0 then
    raise exception 'confirm_match no longer calls ensure_user_challenge; check this migration';
  end if;
  d := replace(d, 'ensure_user_challenge(', 'ensure_user_challenge_internal(');
  execute d;
end $$;

revoke execute on function public.ensure_user_challenge_internal(uuid,uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.ensure_user_challenge_internal(uuid,uuid,text,boolean) to service_role;

create or replace function public.ensure_user_challenge(
  p_user_id uuid,
  p_template_id uuid default null,
  p_custom_habit_title text default null,
  p_force_new boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' and p_user_id is distinct from auth.uid() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return public.ensure_user_challenge_internal(p_user_id, p_template_id, p_custom_habit_title, p_force_new);
end;
$$;
revoke execute on function public.ensure_user_challenge(uuid,uuid,text,boolean) from public, anon;
grant execute on function public.ensure_user_challenge(uuid,uuid,text,boolean) to authenticated, service_role;

-- 4. start_user_challenge: the same check, added at the top of its body.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.start_user_challenge(uuid,uuid,text,text)'::regprocedure);
  d := regexp_replace(d, E'\nbegin\n',
    E'\nbegin\n  if auth.role() is distinct from ''service_role'' and p_user_id is distinct from auth.uid() then\n    raise exception ''not allowed'' using errcode = ''42501'';\n  end if;\n', '');
  execute d;
end $$;
revoke execute on function public.start_user_challenge(uuid,uuid,text,text) from public, anon;
grant execute on function public.start_user_challenge(uuid,uuid,text,text) to authenticated, service_role;

-- 5. Profile photos had no size or type limit. The app crops to a square at
--    70% quality, which comes out well under 2 MB, so 5 MB never blocks a real
--    photo and stops anything bigger. HEIC too, because the iPhone photo
--    picker can hand those over as-is.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'avatars';
