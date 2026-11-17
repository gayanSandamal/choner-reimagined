-- No quiet hours (decided 17 November 2026). Every notification is a push at
-- any hour of the day, in the receiver's time zone or not. Before this, from
-- 22:00 to 08:00 in the receiver's time a notification was only written to the
-- in-app list (no buzz, nothing on the lock screen) and was never pushed
-- later, and a nudge was refused outright. Early runners missed day-of notices
-- ("arrived", "running late") until 08:00.
--
-- Three live places had the rule. The in-app row is still the fallback when
-- the server keys are missing, as before. sweep_daily_reminders and
-- sweep_missed_checkins also mention 22:00/08:00 but belong to the old daily
-- model and are not scheduled, so they are left alone.
do $$
declare d text; n text;
begin
  -- 1. notify_user: every notification goes through this.
  d := pg_get_functiondef('public.notify_user(uuid,text,text,text,text,jsonb,text)'::regprocedure);
  n := replace(d,
    'if v_local::time >= time ''22:00'' or v_local::time < time ''08:00'' or v_key is null or v_url is null then',
    'if v_key is null or v_url is null then');
  if n = d then raise exception 'notify_user: quiet-hours check not found'; end if;
  execute n;

  -- 2. confirm_match: the "said yes" notice has its own copy of the rule.
  d := pg_get_functiondef('public.confirm_match(uuid)'::regprocedure);
  n := regexp_replace(d,
    'if v_local::time >= time ''22:00'' or v_local::time < time ''08:00''\s+or v_key is null',
    'if v_key is null');
  if n = d then raise exception 'confirm_match: quiet-hours check not found'; end if;
  execute n;

  -- 3. nudge_partner: refused at night with reason quiet_hours.
  d := pg_get_functiondef('public.nudge_partner()'::regprocedure);
  n := regexp_replace(d,
    'if v_partner_local::time >= time ''22:00'' or v_partner_local::time < time ''08:00'' then\s+return jsonb_build_object\(''sent'', false, ''reason'', ''quiet_hours''\);\s+end if;',
    '');
  if n = d then raise exception 'nudge_partner: quiet-hours check not found'; end if;
  execute n;
end $$;
