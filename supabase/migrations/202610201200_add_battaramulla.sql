-- Battaramulla was missing from Greater Colombo. Reported by a friend of
-- Dinesh's on 20 October, and he was right: it is one of the larger suburbs in
-- the belt, sitting between Rajagiriya and Koswatte on the Kotte side.
--
-- It was left out ON PURPOSE, which is why this needs saying. The prototype
-- had it, the app's locations table did not, and FIRST_200_BUILD_SPEC.md §
-- "It invents a location" told the First 200 form to drop it so the form could
-- not offer something the database would reject on the foreign key. That was
-- the right call at the time: the form must mirror the app. The mistake was
-- further back, in the app's own list, and this fixes it there.
--
-- LESSON FROM #140, APPLIED: a location row on its own is only half the job.
-- Mattegoda went in on 14 October with no corridor tags, and because
-- get_match_pool blocks an in-person pair at the hard filter when the tag set
-- is empty, anyone whose only area was Mattegoda was silently unmatchable.
-- The tag goes in here, in the same migration, so the two can never separate.

insert into public.locations (value, label, location_group, sort_order)
values ('battaramulla', 'Battaramulla', 'greater_colombo', 70)
on conflict (value) do nothing;

-- kotte_belt only, matching its immediate neighbours exactly: koswatte,
-- pelawatte, thalawathugoda and kotte all carry that one tag and nothing else.
--
-- Deliberately NOT inner_east: that tag stops at Rajagiriya and Welikada, which
-- are a step closer to the city, and stretching it out to Battaramulla would
-- quietly make every inner-city match look like a local one.
--
-- Deliberately NOT avissawella_road: that is the Low Level Road corridor
-- through Kolonnawa, Mulleriyawa and Kaduwela. Battaramulla sits on the
-- Parliament Road / Kaduwela Road axis instead.
insert into public.location_tags (location_value, tag)
values ('battaramulla', 'kotte_belt')
on conflict do nothing;

-- Greater Colombo is stored in alphabetical order and appending breaks it, so
-- renumber the group by label, exactly as 202610051200_add_mattegoda.sql did.
-- Idempotent: re-running changes nothing.
--
-- Nothing reads sort_order except the picker's default ordering, and
-- app/find/form.tsx filters by label anyway.
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
