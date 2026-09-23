-- Push #1 (handover §7.1): tell the other person the moment one side accepts.
-- Unchanged from 202609182000_multi_challenge.sql apart from the notice.

create or replace function public.confirm_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_both boolean;
  v_a_challenge uuid;
  v_b_challenge uuid;
  v_days int;
  v_other uuid;
  v_name text;
  v_tz text;
  v_local timestamp;
  v_key text;
  v_url text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into r from public.partner_matches
  where id = p_match_id and status = 'pending'
  for update;

  if r.id is null then
    raise exception 'match not found or already settled';
  end if;
  if v_uid <> r.user_a and v_uid <> r.user_b then
    raise exception 'not your match';
  end if;

  if v_uid = r.user_a then
    update public.partner_matches set a_confirmed = true, updated_at = now() where id = r.id;
    v_both := r.b_confirmed;
  else
    update public.partner_matches set b_confirmed = true, updated_at = now() where id = r.id;
    v_both := r.a_confirmed;
  end if;

  if not v_both then
    -- Handover §7.1: the moment one side says yes, the other hears about it
    -- and lands straight on their own accept screen. Never fatal — a failed
    -- notice must not undo the yes. Quiet hours (22:00-08:00 in the
    -- recipient's own time) get the in-app row only, no push, the same
    -- courtesy nudge_partner() extends.
    begin
      v_other := case when r.user_a = v_uid then r.user_b else r.user_a end;
      select split_part(coalesce(full_name, 'Your match'), ' ', 1) into v_name
      from public.profiles where id = v_uid;
      select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_other;
      v_local := now() at time zone coalesce(v_tz, 'UTC');
      select value into v_key from public.app_config where key = 'service_role_key';
      select value into v_url from public.app_config where key = 'functions_base_url';

      if v_local::time >= time '22:00' or v_local::time < time '08:00'
         or v_key is null or v_url is null then
        insert into public.notifications (user_id, kind, title, body, data)
        values (v_other, 'partner_accepted', v_name || ' said yes',
                'Accept to start together.', jsonb_build_object('route', '/(tabs)/find'));
      else
        perform net.http_post(
          url := v_url || '/send-push',
          headers := jsonb_build_object('Content-Type', 'application/json',
                                        'Authorization', 'Bearer ' || v_key),
          body := jsonb_build_object(
            'userId', v_other,
            'kind', 'partner_accepted',
            'title', v_name || ' said yes',
            'body', 'Accept to start together.',
            'route', '/(tabs)/find'));
      end if;
    exception when others then
      raise notice 'confirm_match: acceptance notice failed, match unaffected';
    end;

    return jsonb_build_object('confirmed', true, 'both', false);
  end if;

  update public.partner_matches
  set status = 'confirmed', updated_at = now() where id = r.id;

  -- Use the challenges the match was actually made on. Falling back to
  -- ensure_user_challenge only covers pre-migration rows that never carried
  -- them; for anything new the ids are always present, so a second concurrent
  -- challenge can no longer be paired by accident.
  v_a_challenge := coalesce(r.user_challenge_a,
                            public.ensure_user_challenge(r.user_a, r.challenge_template_id));
  v_b_challenge := coalesce(r.user_challenge_b,
                            public.ensure_user_challenge(r.user_b, r.challenge_template_id));

  -- Honour the template's own length rather than a hardcoded 7 days —
  -- duration_days equality is a hard block in the matcher, so the two
  -- disagreeing was a real inconsistency.
  select coalesce(duration_days, 7) into v_days
  from public.challenge_templates where id = r.challenge_template_id;

  update public.user_challenges
  set partner_user_id = r.user_b, partner_state = 'partnered',
      status = 'active', started_at = now(),
      ends_at = now() + make_interval(days => coalesce(v_days, 7))
  where id = v_a_challenge;

  update public.user_challenges
  set partner_user_id = r.user_a, partner_state = 'partnered',
      status = 'active', started_at = now(),
      ends_at = now() + make_interval(days => coalesce(v_days, 7))
  where id = v_b_challenge;

  -- Close the requests out. Leaving them on 'matched' forever is what let
  -- stale rows pile up and collide with the one-waiting index later.
  update public.partner_match_requests
  set status = 'cancelled', updated_at = now()
  where user_challenge_id in (v_a_challenge, v_b_challenge)
    and status in ('waiting', 'matched');

  return jsonb_build_object('confirmed', true, 'both', true);
end;
$$;

notify pgrst, 'reload schema';
