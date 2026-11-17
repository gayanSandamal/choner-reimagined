-- Planning steps notify the other person (decided 17 November 2026). Saying
-- hi, replying, answering how far, suggesting a value and agreeing to one all
-- happened silently, so a pair stalled on "Waiting for Nadeesha" unless the
-- other person happened to open the app. Each now sends a plan_update push
-- (the same kind and preference as the other plan notices) to the other
-- person, opening their plan.

-- What a suggestion is about, in words.
create or replace function public.plan_field_label(p_field text)
returns text
language sql
immutable
as $$
  select case p_field
    when 'distance' then 'how far'
    when 'cadence' then 'how often'
    when 'mode' then 'how to do it'
    when 'place' then 'where to meet'
    when 'time' then 'a time'
    when 'day_time' then 'a time'
    else 'the plan'
  end;
$$;

-- One place for the push, so every step reads and routes the same way.
create or replace function public.notify_plan_step(
  p pair_plans, p_to uuid, p_title text, p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_to is null then return; end if;
  perform public.notify_user(p_to, 'plan_update', p_title, p_body,
    '/challenge/' || public.plan_my_challenge(p, p_to), jsonb_build_object('plan_id', p.id));
exception when others then
  -- A notice must never undo the step it is about.
  raise notice 'notify_plan_step: not delivered';
end;
$$;
revoke all on function public.notify_plan_step(pair_plans, uuid, text, text) from public, anon, authenticated;
revoke all on function public.plan_field_label(text) from public, anon;

do $$
declare d text; n text;
begin
  -- 1. Say hi and the reply.
  d := pg_get_functiondef('public.send_pair_message(uuid,text)'::regprocedure);
  n := replace(d,
    E'  return jsonb_build_object(''ok'', true);\nend;',
    E'  if p_key = ''opener'' then\n'
    || E'    perform public.notify_plan_step(p, public.plan_other(p, v_uid),\n'
    || E'      public.first_name_of(v_uid) || '' said hi'', ''Say hi back.'');\n'
    || E'  else\n'
    || E'    perform public.notify_plan_step(p, public.plan_other(p, v_uid),\n'
    || E'      public.first_name_of(v_uid) || '' replied'',\n'
    || E'      ''Let''''s plan your first '' || coalesce(public.activity_noun(p.activity_key), ''session'') || ''.'');\n'
    || E'  end if;\n'
    || E'  return jsonb_build_object(''ok'', true);\nend;');
  if n = d then raise exception 'send_pair_message: return not found'; end if;
  execute n;

  -- 2. How far: tell them it's their turn, or that both have answered.
  d := pg_get_functiondef('public.set_distance_answer(uuid,text)'::regprocedure);
  n := replace(d,
    E'  return jsonb_build_object(''ok'', true, ''agreed''',
    E'  perform public.notify_plan_step(p, public.plan_other(p, v_uid),\n'
    || E'    public.first_name_of(v_uid) || case when v_theirs is null then '' answered how far'' else '' answered too'' end,\n'
    || E'    case when v_theirs is null then ''Your turn.'' else ''On to the next step.'' end);\n'
    || E'  return jsonb_build_object(''ok'', true, ''agreed''');
  if n = d then raise exception 'set_distance_answer: return not found'; end if;
  execute n;

  -- 3. A suggestion (how often, where, when, how).
  d := pg_get_functiondef('public.propose_plan_value(uuid,text,jsonb)'::regprocedure);
  n := replace(d,
    E'  return jsonb_build_object(''ok'', true, ''round'', v_round);',
    E'  perform public.notify_plan_step(p, public.plan_other(p, v_uid),\n'
    || E'    public.first_name_of(v_uid) || '' suggested '' || public.plan_field_label(p_field),\n'
    || E'    ''Agree or suggest another.'');\n'
    || E'  return jsonb_build_object(''ok'', true, ''round'', v_round);');
  if n = d then raise exception 'propose_plan_value: return not found'; end if;
  execute n;

  -- 4. Agreeing to a suggestion: tell whoever suggested it.
  d := pg_get_functiondef('public.accept_plan_proposal(uuid,timestamp with time zone)'::regprocedure);
  n := replace(d,
    E'  return jsonb_build_object(''ok'', true);\nend;',
    E'  perform public.notify_plan_step(p, r.proposed_by,\n'
    || E'    public.first_name_of(v_uid) || '' agreed on '' || public.plan_field_label(r.field),\n'
    || E'    ''On to the next step.'');\n'
    || E'  return jsonb_build_object(''ok'', true);\nend;');
  if n = d then raise exception 'accept_plan_proposal: return not found'; end if;
  execute n;
end $$;
