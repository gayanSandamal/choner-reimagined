-- Mattegoda was added to public.locations on 14 October (202610051200) and
-- never given corridor tags, which made it the ONLY untagged location of 68.
--
-- That is not cosmetic. get_match_pool derives locationTags from
-- location_tags, and its own comment says an empty set "blocks in-person pairs
-- at the hard filter rather than silently scoring them zero". So anyone whose
-- only area was Mattegoda could not be matched in person AT ALL, silently.
-- Two of the First 200 registrations had picked it.
--
-- Found on 16 October while proving that a second area widens the tag set
-- (#140): the one-area control for Mattegoda came back null.
--
-- Tags match Piliyandala, its nearest comparable: Mattegoda sits off the High
-- Level corridor between Kottawa and Piliyandala, and reaches Horana Road
-- through Kesbewa. Neighbouring Kottawa and Homagama carry high_level alone;
-- Piliyandala and Kesbewa carry both.
insert into public.location_tags (location_value, tag)
values ('mattegoda', 'high_level'),
       ('mattegoda', 'horana_road')
on conflict do nothing;
