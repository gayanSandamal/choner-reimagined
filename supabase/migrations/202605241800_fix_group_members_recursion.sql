-- ============================================================
-- Fix infinite recursion in group_members RLS policy.
--
-- The previous policy group_members_visible_to_group_members
-- ran `select ... from group_members` inside the SELECT policy
-- on group_members itself, which Postgres rejects with
-- "infinite recursion detected in policy for relation
-- 'group_members'".
--
-- Fix: use a SECURITY DEFINER helper that bypasses RLS to
-- answer the "is this user in this group?" question, then
-- reference the helper from the policy.
-- ============================================================

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id = p_user_id
  );
$$;

revoke all on function public.is_group_member(uuid, uuid) from public;
grant execute on function public.is_group_member(uuid, uuid) to anon, authenticated, service_role;

-- Drop the recursive policy if it exists.
drop policy if exists group_members_visible_to_group_members on public.group_members;

-- Recreate using the SECURITY DEFINER helper so the policy
-- does not re-enter group_members under RLS.
create policy group_members_visible_to_group_members
  on public.group_members
  for select
  using (
    user_id = auth.uid()
    or public.is_group_member(group_id, auth.uid())
  );

-- The older policy group_members_own (select where user_id = auth.uid())
-- becomes redundant once the policy above is in place; drop it to keep
-- only one SELECT policy on the table.
drop policy if exists group_members_own on public.group_members;
