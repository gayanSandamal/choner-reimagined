-- Phase 4 — tag-based location proximity (Choner_Location_List_Spec_v2.md).
--
-- v1 gave every location exactly one zone, which forced bad calls at
-- boundaries: Rajagiriya was "Kotte Belt" only, though it is just as close to
-- Borella. v2 gives each location 1-3 corridor tags and defines closeness as
-- shared tags over combined tags, which removes the need for a separate
-- adjacency map that could drift out of sync.
--
-- Tags live in their own table keyed by location value, NEVER on the user
-- record, so the (explicitly first-draft) tagging can be corrected later with
-- a data-only migration and no user data touched.
--
-- This also retires profiles.city as a matching signal. city is derived as
-- split_part(timezone, '/', -1), so every Sri Lankan user is literally
-- 'Colombo' — it awarded its points to the entire local pool at once and did
-- no ranking work at all.

create table if not exists public.locations (
  value text primary key,
  label text not null,
  location_group text not null check (location_group in ('colombo_city', 'greater_colombo')),
  sort_order int not null default 0
);

create table if not exists public.location_tags (
  location_value text not null references public.locations(value) on delete cascade,
  tag text not null check (tag in (
    'inner_city', 'harbor_north', 'galle_road', 'high_level', 'kotte_belt',
    'inner_east', 'avissawella_road', 'kandy_road', 'negombo_road', 'horana_road'
  )),
  primary key (location_value, tag)
);

create index if not exists location_tags_tag_idx on public.location_tags (tag);

-- Both are public reference data: everyone reads them, nobody writes them.
alter table public.locations enable row level security;
alter table public.location_tags enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'locations' and policyname = 'locations_read_all') then
    create policy locations_read_all on public.locations for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'location_tags' and policyname = 'location_tags_read_all') then
    create policy location_tags_read_all on public.location_tags for select using (true);
  end if;
end $$;

insert into public.locations (value, label, location_group, sort_order) values
  ('fort', 'Fort (Colombo 1)', 'colombo_city', 0),
  ('slave_island', 'Slave Island (Colombo 2)', 'colombo_city', 1),
  ('union_place', 'Union Place (Colombo 2)', 'colombo_city', 2),
  ('kollupitiya', 'Kollupitiya (Colombo 3)', 'colombo_city', 3),
  ('bambalapitiya', 'Bambalapitiya (Colombo 4)', 'colombo_city', 4),
  ('havelock_town', 'Havelock Town (Colombo 5)', 'colombo_city', 5),
  ('narahenpita', 'Narahenpita (Colombo 5)', 'colombo_city', 6),
  ('kirulapone_north', 'Kirulapone North (Colombo 5)', 'colombo_city', 7),
  ('wellawatte', 'Wellawatte (Colombo 6)', 'colombo_city', 8),
  ('pamankada', 'Pamankada (Colombo 6)', 'colombo_city', 9),
  ('kirulapone_south', 'Kirulapone South (Colombo 6)', 'colombo_city', 10),
  ('cinnamon_gardens', 'Cinnamon Gardens (Colombo 7)', 'colombo_city', 11),
  ('borella', 'Borella (Colombo 8)', 'colombo_city', 12),
  ('dematagoda', 'Dematagoda (Colombo 9)', 'colombo_city', 13),
  ('maradana', 'Maradana (Colombo 10)', 'colombo_city', 14),
  ('maligawatta', 'Maligawatta (Colombo 10)', 'colombo_city', 15),
  ('panchikawatte', 'Panchikawatte (Colombo 10)', 'colombo_city', 16),
  ('pettah', 'Pettah (Colombo 11)', 'colombo_city', 17),
  ('hulftsdorp', 'Hulftsdorp (Colombo 12)', 'colombo_city', 18),
  ('kotahena', 'Kotahena (Colombo 13)', 'colombo_city', 19),
  ('kochchikade', 'Kochchikade (Colombo 13)', 'colombo_city', 20),
  ('bloemendhal', 'Bloemendhal (Colombo 13)', 'colombo_city', 21),
  ('grandpass', 'Grandpass (Colombo 14)', 'colombo_city', 22),
  ('mattakkuliya', 'Mattakkuliya (Colombo 15)', 'colombo_city', 23),
  ('modara', 'Modara (Colombo 15)', 'colombo_city', 24),
  ('mutwal', 'Mutwal (Colombo 15)', 'colombo_city', 25),
  ('madampitiya', 'Madampitiya (Colombo 15)', 'colombo_city', 26),
  ('ambatale', 'Ambatale', 'greater_colombo', 27),
  ('athurugiriya', 'Athurugiriya', 'greater_colombo', 28),
  ('batuwatta', 'Batuwatta', 'greater_colombo', 29),
  ('boralesgamuwa', 'Boralesgamuwa', 'greater_colombo', 30),
  ('dalugama', 'Dalugama', 'greater_colombo', 31),
  ('dehiwala', 'Dehiwala', 'greater_colombo', 32),
  ('hokandara', 'Hokandara', 'greater_colombo', 33),
  ('homagama', 'Homagama', 'greater_colombo', 34),
  ('ja_ela', 'Ja-Ela', 'greater_colombo', 35),
  ('kadawatha', 'Kadawatha', 'greater_colombo', 36),
  ('kaduwela', 'Kaduwela', 'greater_colombo', 37),
  ('kalubowila', 'Kalubowila', 'greater_colombo', 38),
  ('kandana', 'Kandana', 'greater_colombo', 39),
  ('katunayake', 'Katunayake', 'greater_colombo', 40),
  ('kelaniya', 'Kelaniya', 'greater_colombo', 41),
  ('kesbewa', 'Kesbewa', 'greater_colombo', 42),
  ('kohuwala', 'Kohuwala', 'greater_colombo', 43),
  ('kolonnawa', 'Kolonnawa', 'greater_colombo', 44),
  ('koswatte', 'Koswatte', 'greater_colombo', 45),
  ('kotikawatta', 'Kotikawatta', 'greater_colombo', 46),
  ('kottawa', 'Kottawa', 'greater_colombo', 47),
  ('maharagama', 'Maharagama', 'greater_colombo', 48),
  ('malabe', 'Malabe', 'greater_colombo', 49),
  ('moratuwa', 'Moratuwa', 'greater_colombo', 50),
  ('mount_lavinia', 'Mount Lavinia', 'greater_colombo', 51),
  ('mulleriyawa', 'Mulleriyawa', 'greater_colombo', 52),
  ('nawala', 'Nawala', 'greater_colombo', 53),
  ('nugegoda', 'Nugegoda', 'greater_colombo', 54),
  ('oruwala', 'Oruwala', 'greater_colombo', 55),
  ('pannipitiya', 'Pannipitiya', 'greater_colombo', 56),
  ('pelawatte', 'Pelawatte', 'greater_colombo', 57),
  ('peliyagoda', 'Peliyagoda', 'greater_colombo', 58),
  ('piliyandala', 'Piliyandala', 'greater_colombo', 59),
  ('ragama', 'Ragama', 'greater_colombo', 60),
  ('rajagiriya', 'Rajagiriya', 'greater_colombo', 61),
  ('ratmalana', 'Ratmalana', 'greater_colombo', 62),
  ('kotte', 'Sri Jayawardenepura Kotte', 'greater_colombo', 63),
  ('thalawathugoda', 'Thalawathugoda', 'greater_colombo', 64),
  ('wattala', 'Wattala', 'greater_colombo', 65),
  ('welikada', 'Welikada', 'greater_colombo', 66),
  ('wickramasinghapura', 'Wickramasinghapura', 'greater_colombo', 67)
on conflict (value) do update set label = excluded.label,
                                  location_group = excluded.location_group,
                                  sort_order = excluded.sort_order;

insert into public.location_tags (location_value, tag) values
  ('fort', 'inner_city'),
  ('slave_island', 'inner_city'),
  ('union_place', 'inner_city'),
  ('kollupitiya', 'inner_city'),
  ('kollupitiya', 'galle_road'),
  ('bambalapitiya', 'galle_road'),
  ('havelock_town', 'inner_east'),
  ('havelock_town', 'galle_road'),
  ('narahenpita', 'inner_east'),
  ('kirulapone_north', 'inner_east'),
  ('kirulapone_north', 'high_level'),
  ('wellawatte', 'galle_road'),
  ('pamankada', 'galle_road'),
  ('kirulapone_south', 'galle_road'),
  ('kirulapone_south', 'high_level'),
  ('cinnamon_gardens', 'inner_city'),
  ('cinnamon_gardens', 'inner_east'),
  ('borella', 'inner_east'),
  ('borella', 'inner_city'),
  ('dematagoda', 'inner_east'),
  ('dematagoda', 'inner_city'),
  ('maradana', 'inner_city'),
  ('maligawatta', 'inner_city'),
  ('panchikawatte', 'inner_city'),
  ('pettah', 'inner_city'),
  ('hulftsdorp', 'inner_city'),
  ('kotahena', 'harbor_north'),
  ('kochchikade', 'harbor_north'),
  ('kochchikade', 'inner_city'),
  ('bloemendhal', 'harbor_north'),
  ('grandpass', 'inner_city'),
  ('grandpass', 'harbor_north'),
  ('mattakkuliya', 'harbor_north'),
  ('modara', 'harbor_north'),
  ('mutwal', 'harbor_north'),
  ('madampitiya', 'harbor_north'),
  ('ambatale', 'avissawella_road'),
  ('athurugiriya', 'avissawella_road'),
  ('athurugiriya', 'high_level'),
  ('batuwatta', 'kandy_road'),
  ('boralesgamuwa', 'high_level'),
  ('boralesgamuwa', 'horana_road'),
  ('dalugama', 'kandy_road'),
  ('dehiwala', 'galle_road'),
  ('hokandara', 'kotte_belt'),
  ('hokandara', 'avissawella_road'),
  ('homagama', 'high_level'),
  ('ja_ela', 'negombo_road'),
  ('kadawatha', 'kandy_road'),
  ('kaduwela', 'avissawella_road'),
  ('kaduwela', 'kotte_belt'),
  ('kalubowila', 'galle_road'),
  ('kalubowila', 'high_level'),
  ('kandana', 'negombo_road'),
  ('katunayake', 'negombo_road'),
  ('kelaniya', 'kandy_road'),
  ('kesbewa', 'horana_road'),
  ('kesbewa', 'high_level'),
  ('kohuwala', 'high_level'),
  ('kohuwala', 'horana_road'),
  ('kolonnawa', 'avissawella_road'),
  ('kolonnawa', 'inner_east'),
  ('koswatte', 'kotte_belt'),
  ('kotikawatta', 'avissawella_road'),
  ('kottawa', 'high_level'),
  ('maharagama', 'high_level'),
  ('malabe', 'kotte_belt'),
  ('malabe', 'avissawella_road'),
  ('moratuwa', 'galle_road'),
  ('mount_lavinia', 'galle_road'),
  ('mulleriyawa', 'avissawella_road'),
  ('nawala', 'kotte_belt'),
  ('nawala', 'inner_east'),
  ('nugegoda', 'high_level'),
  ('nugegoda', 'kotte_belt'),
  ('oruwala', 'avissawella_road'),
  ('pannipitiya', 'high_level'),
  ('pelawatte', 'kotte_belt'),
  ('peliyagoda', 'kandy_road'),
  ('peliyagoda', 'harbor_north'),
  ('piliyandala', 'high_level'),
  ('piliyandala', 'horana_road'),
  ('ragama', 'kandy_road'),
  ('rajagiriya', 'kotte_belt'),
  ('rajagiriya', 'inner_east'),
  ('ratmalana', 'galle_road'),
  ('kotte', 'kotte_belt'),
  ('thalawathugoda', 'kotte_belt'),
  ('wattala', 'negombo_road'),
  ('welikada', 'kotte_belt'),
  ('welikada', 'inner_east'),
  ('wickramasinghapura', 'kotte_belt')
on conflict do nothing;

-- The cap the spec sets: beyond 3 tags everything overlaps with everything and
-- the tags stop discriminating. Enforced as a trigger because a plain check
-- constraint can't see sibling rows.
create or replace function public.enforce_location_tag_cap()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.location_tags where location_value = new.location_value) > 3 then
    raise exception 'a location may carry at most 3 corridor tags';
  end if;
  return new;
end;
$$;

drop trigger if exists location_tags_cap on public.location_tags;
create constraint trigger location_tags_cap
  after insert or update on public.location_tags
  deferrable initially deferred
  for each row execute function public.enforce_location_tag_cap();

-- ============================================================
-- location_proximity — shared tags over combined tags
--
--   1.00        same corridor set        full score
--   0.33-0.99   real overlap             partial, scaled
--   0           no shared corridor       hard block for in-person modes
-- ============================================================
create or replace function public.location_proximity(p_a text, p_b text)
returns numeric
language sql
stable
as $$
  with a as (select tag from public.location_tags where location_value = p_a),
       b as (select tag from public.location_tags where location_value = p_b)
  select case
    when p_a is null or p_b is null then 0
    when not exists (select 1 from a) or not exists (select 1 from b) then 0
    else (select count(*)::numeric from (select tag from a intersect select tag from b) i)
       / nullif((select count(*)::numeric from (select tag from a union select tag from b) u), 0)
  end;
$$;

grant execute on function public.location_proximity(text, text) to authenticated;

-- Where the user is willing to meet. Only meaningful when mode = 'together'.
alter table public.user_challenges
  add column if not exists preferred_location text references public.locations(value);
