-- Mattegoda was missing from the Greater Colombo list. Added for The First 200,
-- where it has to exist before a registration can reference it:
-- 202610061200_first_200_registrations.sql puts a foreign key on
-- prelaunch_registrations.location -> public.locations(value), so without this
-- row every submission from Mattegoda fails on an FK violation.
--
-- MUST RUN BEFORE 202610061200. The filename orders it there.
--
-- Kottawa needs nothing; it was already present.
insert into public.locations (value, label, location_group, sort_order)
values ('mattegoda', 'Mattegoda', 'greater_colombo', 68)
on conflict (value) do nothing;

-- Greater Colombo was inserted in alphabetical order and appending breaks it,
-- so renumber the group by label. Idempotent: re-running changes nothing.
--
-- Note this moves 'kotte' ("Sri Jayawardenepura Kotte") down to the S's, which
-- is where its label belongs. Nothing reads sort_order except the picker's
-- default ordering, and app/find/form.tsx filters by label anyway.
with ordered as (
  select value, 27 + (row_number() over (order by label)) - 1 as n
  from public.locations
  where location_group = 'greater_colombo'
)
update public.locations l
   set sort_order = o.n
  from ordered o
 where l.value = o.value
   and l.sort_order <> o.n;
