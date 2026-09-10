-- Deleting a storage.objects row via SQL does not delete the underlying bytes
-- from the storage backend - only the Storage API does that. So this sweep
-- finds candidates and hands them to the cleanup-checkin-photos edge function
-- (service-role call, same shape as sweep_daily_reminders -> send-push), which
-- does the actual supabase.storage.remove() and then nulls photo_path once
-- deletion is confirmed.
--
-- Fire-and-forget on purpose, same as the other sweeps: if the edge function
-- call fails, photo_path is still non-null afterward, so this same row is
-- simply picked up again on the next tick - no separate retry bookkeeping.
create or replace function public.sweep_checkin_photo_cleanup()
returns integer
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_key text;
  v_url text;
  v_paths text[];
  v_ids uuid[];
begin
  select value into v_key from public.app_config where key = 'service_role_key';
  select value into v_url from public.app_config where key = 'functions_base_url';

  if v_key is null or v_url is null then
    raise notice 'sweep_checkin_photo_cleanup: config missing, nothing sent';
    return 0;
  end if;

  select array_agg(photo_path), array_agg(id)
  into v_paths, v_ids
  from public.task_checkins
  where photo_path is not null
    and (photo_viewed_at is not null or created_at < now() - interval '7 days');

  if v_paths is null or array_length(v_paths, 1) is null then
    return 0;
  end if;

  perform net.http_post(
    url := v_url || '/cleanup-checkin-photos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('paths', to_jsonb(v_paths), 'checkin_ids', to_jsonb(v_ids))
  );

  return array_length(v_paths, 1);
end;
$$;

revoke all on function public.sweep_checkin_photo_cleanup() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('choner-checkin-photo-cleanup');
exception when others then
  null; -- not scheduled yet
end $$;

-- Every 15 minutes: viewed photos should disappear promptly, not sit for an
-- hour like the once-a-day sweeps elsewhere in this app.
select cron.schedule(
  'choner-checkin-photo-cleanup',
  '*/15 * * * *',
  $cron$select public.sweep_checkin_photo_cleanup()$cron$
);

-- pg_cron's launcher on this project caches its job list and does not notice a
-- newly scheduled job on its own (documented the hard way in
-- 202608211600_cron_reload.sql) - without this the row in cron.job looks
-- correct and the job simply never fires.
select pg_reload_conf();
