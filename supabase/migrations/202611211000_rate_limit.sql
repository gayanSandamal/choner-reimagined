-- Rate limiting for edge functions (places-autocomplete, invite-email,
-- register-first-200). Fixed window, one row per key per window.
--
-- RLS is on with no policies and no grants, so only service_role (the edge
-- functions) touches it. Same shape as app_config.

create table if not exists public.rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Counts one hit and returns true when the caller is now OVER p_max within the
-- current window. The upsert is atomic, so two simultaneous requests cannot
-- both read "9 of 10" and both pass.
create or replace function public.rate_limit_hit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_hits   integer;
begin
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  -- Keep the table small: old windows are never read again. Cheap, because the
  -- primary key leads with key and this only runs on a small fraction of calls.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits > p_max;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
