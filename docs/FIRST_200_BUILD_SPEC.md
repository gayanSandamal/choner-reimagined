# The First 200 — build spec

**Written 5 October 2026. Launch target: ~19 October.**

Scope is set by the two-week window. Every vocabulary list below was taken from
`origin/main` at `7289a37`, not from the initiative doc, so the web app and the
app agree on day one.

## Scope decision

With two weeks, First 200 is a **seeding** exercise, not a pre-matching one.
§12's pipeline (registered → ready → proposed → paired) needs weeks to run; you
get one round at best. The goal is a warm, matchable pool standing in the app
on launch day.

**Build:** form → database → confirmation with a code → one email.
**Don't build:** match-proposal tables, a status pipeline, admin tooling, or the
onboarding prefill. See §9.

---

# 1. Corrections to the existing prototype

The prototype (`Join the Choner waitlist`) is sound in structure and styling —
tokens, stepbar and component classes already match the app. Six changes.

## 1.1 The activity list is wrong

Current:

```js
const ACTIVITIES = [['run','Running','run'],['jog','Jogging','run'],['walk','Walking','walk'],
                    ['cycle','Cycling','bike'],['yoga','Yoga','leaf'],['work','Workouts','dumb']];
```

**Every key is wrong**, and the set is right only by accident — Jogging *is* an
MVP activity and Badminton is *not*.

The authority is `202610020900_six_activities.sql:75`, which sets
`is_active` for exactly six slugs. **Badminton exists as a template but is
deactivated** (inserted `is_active = false` in `202609181600` and never turned
on), so it must not appear on the form. Jogging was added as its own
`activity_key` in `202610012200_jogging_and_cycling.sql:23`.

The six, in the app's own `sort_order`:

| slug | label | `activity_key` |
|---|---|---|
| `activity-running` | Running | `running` |
| `activity-jogging` | Jogging | `jogging` |
| `activity-walking` | Walking | `walking` |
| `activity-cycling` | Cycling | `cycling` |
| `activity-yoga` | Yoga | `yoga` |
| `activity-workouts` | Workouts | `home_workouts` |

Replace with:

```js
// The six active templates, in the app's sort_order. Keys are activity_key,
// which is what matching reads — note Workouts stores 'home_workouts'.
// Badminton is NOT here: its template exists but is_active = false.
const ACTIVITIES = [
  ['running',      'Running',  'run'],
  ['jogging',      'Jogging',  'run'],
  ['walking',      'Walking',  'walk'],
  ['cycling',      'Cycling',  'bike'],
  ['yoga',         'Yoga',     'leaf'],
  ['home_workouts','Workouts', 'dumb'],   // the app's label is "Workouts"
];
```

The sub-line under each is `Together or separately`, as the app's picker shows
it — a reminder that mode is a separate choice, not a property of the activity.

## 1.1b Workouts needs an exercise picker

Picking Workouts in the app opens a second question: **up to four exercise
types.** The web app must ask the same thing, or a Workouts registration
carries less than the app already knows how to hold.

`user_challenges.exercises` is `text[]` with
`check (cardinality(exercises) <= 4)` (`202610011050_workout_exercises.sql`).
It is **free text, not an enum** — the vocabulary is a UI concern, and it lives
in `features/challenges/exercises.ts`:

```js
// features/challenges/exercises.ts, verbatim. Stored as written — the column
// is text[], not an enum.
const EXERCISES = ['Push-ups','Squats','Lunges','Sit-ups','Pull-ups',
                   'Plank','Burpees','Jumping jacks','Stretching routine'];
const MAX_EXERCISES = 4;
```

Render it only when `S.activity === 'home_workouts'`, as a pill row below the
activity list, reusing `.pillcard`:

```js
${S.activity === 'home_workouts' ? `
  <div class="sect">Which exercises? <span style="text-transform:none;font-weight:400;">up to ${MAX_EXERCISES}</span></div>
  <div class="prow">${EXERCISES.map(e => {
    const on = S.exercises.includes(e);
    const full = S.exercises.length >= MAX_EXERCISES && !on;
    return `<button class="pillcard ${on?'on':''}" data-act="ex" data-v="${esc(e)}"
            ${full?'disabled':''} style="flex:0 1 auto;${full?'opacity:.4;':''}">
            <div class="t">${esc(e)}</div></button>`;
  }).join('')}</div>
  <div style="font-size:11.5px;color:var(--pmuted);line-height:1.5;">These show on your
  card. They don't affect who you're matched with — that's the activity and how long.</div>
` : ''}
```

State and the toggle, mirroring `toggleExercise()` exactly — order is the order
picked, and the cap is silent rather than an error:

```js
// in S:
exercises: [],

// in act():
case 'ex': {
  const i = S.exercises.indexOf(v);
  if (i >= 0) S.exercises.splice(i, 1);
  else if (S.exercises.length < MAX_EXERCISES) S.exercises.push(v);
  break;
}
```

Gate `Finish` on it: `dis: !(S.activity && S.consent && (S.activity !== 'home_workouts' || S.exercises.length))`.
Clear the list when the activity changes away from Workouts, or a switch leaves
stale exercises attached to a run.

## 1.2 The location list is a sample, and partly invented

Current: a 25-item `COLOMBO_LOCATIONS` of display strings. Three problems.

**It is missing Kottawa — but the app is not.** `kottawa` is in the app's table
at `sort_order 47`. **The prototype is the stale one; the app is correct.**

**It invents a location.** `Battaramulla` is in the prototype and **not** in the
app's 68. The nearest real entries are `koswatte`, `pelawatte`,
`thalawathugoda` and `welikada`. Drop it.

**It stores labels, not slugs.** `<option value="${esc(o)}">` puts the display
string in the value, and the label format differs from the app's
(`Colombo 1 - Fort` vs `Fort (Colombo 1)`). Every value must be the slug, or
nothing joins to `public.locations` later.

Replace both constants with the real vocabulary. **Mattegoda is new** — added
below and in §2:

```js
// public.locations, verbatim. value = the slug that goes in the database,
// label = what the app displays, so the two systems read identically.
const COLOMBO_CITY = [
  ['fort','Fort (Colombo 1)'],
  ['slave_island','Slave Island (Colombo 2)'],
  ['union_place','Union Place (Colombo 2)'],
  ['kollupitiya','Kollupitiya (Colombo 3)'],
  ['bambalapitiya','Bambalapitiya (Colombo 4)'],
  ['havelock_town','Havelock Town (Colombo 5)'],
  ['narahenpita','Narahenpita (Colombo 5)'],
  ['kirulapone_north','Kirulapone North (Colombo 5)'],
  ['wellawatte','Wellawatte (Colombo 6)'],
  ['pamankada','Pamankada (Colombo 6)'],
  ['kirulapone_south','Kirulapone South (Colombo 6)'],
  ['cinnamon_gardens','Cinnamon Gardens (Colombo 7)'],
  ['borella','Borella (Colombo 8)'],
  ['dematagoda','Dematagoda (Colombo 9)'],
  ['maradana','Maradana (Colombo 10)'],
  ['maligawatta','Maligawatta (Colombo 10)'],
  ['panchikawatte','Panchikawatte (Colombo 10)'],
  ['pettah','Pettah (Colombo 11)'],
  ['hulftsdorp','Hulftsdorp (Colombo 12)'],
  ['kotahena','Kotahena (Colombo 13)'],
  ['kochchikade','Kochchikade (Colombo 13)'],
  ['bloemendhal','Bloemendhal (Colombo 13)'],
  ['grandpass','Grandpass (Colombo 14)'],
  ['mattakkuliya','Mattakkuliya (Colombo 15)'],
  ['modara','Modara (Colombo 15)'],
  ['mutwal','Mutwal (Colombo 15)'],
  ['madampitiya','Madampitiya (Colombo 15)'],
];

const GREATER_COLOMBO = [
  ['ambatale','Ambatale'],
  ['athurugiriya','Athurugiriya'],
  ['batuwatta','Batuwatta'],
  ['boralesgamuwa','Boralesgamuwa'],
  ['dalugama','Dalugama'],
  ['dehiwala','Dehiwala'],
  ['hokandara','Hokandara'],
  ['homagama','Homagama'],
  ['ja_ela','Ja-Ela'],
  ['kadawatha','Kadawatha'],
  ['kaduwela','Kaduwela'],
  ['kalubowila','Kalubowila'],
  ['kandana','Kandana'],
  ['katunayake','Katunayake'],
  ['kelaniya','Kelaniya'],
  ['kesbewa','Kesbewa'],
  ['kohuwala','Kohuwala'],
  ['kolonnawa','Kolonnawa'],
  ['koswatte','Koswatte'],
  ['kotikawatta','Kotikawatta'],
  ['kottawa','Kottawa'],
  ['maharagama','Maharagama'],
  ['malabe','Malabe'],
  ['mattegoda','Mattegoda'],
  ['moratuwa','Moratuwa'],
  ['mount_lavinia','Mount Lavinia'],
  ['mulleriyawa','Mulleriyawa'],
  ['nawala','Nawala'],
  ['nugegoda','Nugegoda'],
  ['oruwala','Oruwala'],
  ['pannipitiya','Pannipitiya'],
  ['pelawatte','Pelawatte'],
  ['peliyagoda','Peliyagoda'],
  ['piliyandala','Piliyandala'],
  ['ragama','Ragama'],
  ['rajagiriya','Rajagiriya'],
  ['ratmalana','Ratmalana'],
  ['kotte','Sri Jayawardenepura Kotte'],
  ['thalawathugoda','Thalawathugoda'],
  ['wattala','Wattala'],
  ['welikada','Welikada'],
  ['wickramasinghapura','Wickramasinghapura'],
];

// 25 districts. 'colombo_other' covers a Colombo-district address that is not
// one of the 69 areas above.
const SL_DISTRICTS = [
  ['colombo_other','Colombo (outside the areas above)'],
  ['gampaha','Gampaha'], ['kalutara','Kalutara'],
  ['kandy','Kandy'], ['matale','Matale'], ['nuwara_eliya','Nuwara Eliya'],
  ['galle','Galle'], ['matara','Matara'], ['hambantota','Hambantota'],
  ['jaffna','Jaffna'], ['kilinochchi','Kilinochchi'], ['mannar','Mannar'],
  ['vavuniya','Vavuniya'], ['mullaitivu','Mullaitivu'],
  ['batticaloa','Batticaloa'], ['ampara','Ampara'], ['trincomalee','Trincomalee'],
  ['kurunegala','Kurunegala'], ['puttalam','Puttalam'],
  ['anuradhapura','Anuradhapura'], ['polonnaruwa','Polonnaruwa'],
  ['badulla','Badulla'], ['monaragala','Monaragala'],
  ['ratnapura','Ratnapura'], ['kegalle','Kegalle'],
];
```

The select then groups properly, which 69 flat options badly need:

```js
const opts = S.locArea === 'colombo'
  ? `<optgroup label="Colombo City">${COLOMBO_CITY.map(o=>opt(o)).join('')}</optgroup>
     <optgroup label="Greater Colombo">${GREATER_COLOMBO.map(o=>opt(o)).join('')}</optgroup>`
  : SL_DISTRICTS.map(o=>opt(o)).join('');

const opt = ([v,l]) => `<option value="${v}" ${S.location===v?'selected':''}>${esc(l)}</option>`;
```

Keep `S.location` holding the **slug**. Store it as `location` when
`locArea === 'colombo'` and as `district` otherwise — they are separate columns
in §3, because one joins to `public.locations` and the other does not.

## 1.3 Remove the `t2offer` screen

Delete `screenT2Offer()`, its `case 't2offer'` in `render()`, and `'t2offer'`
from `ORDER`. Then:

```js
case 'next-t1': go('struggle'); return;
```

`S.wantsTier2` disappears. In `screenConfirm()`, drop the `matchable` branch and
the `"Actually, help us match me too"` button, leaving one line:

```js
<div class="p-sub">We'll be in touch before Choner opens.</div>
```

The six dots in `S.dots` are already correct and need no change.

## 1.4 The "elsewhere in Sri Lanka" note — make it conditional on mode

Current:

> Matching launches in the Colombo area first. We're keeping this on file for
> when Choner expands to your district.

Wrong for most people who see it. `mode` is step 4 and location is step 5, so
**the answer is already known** — and `separate` has no geographic constraint at
all. Someone outside Colombo who picked *Separately, together* is fully
matchable today, and telling them they're "on file" is both discouraging and
untrue.

(Worth noting: **none of the six active activities forces a mode.** The only
`forced_mode = 'together'` template is Badminton, which is deactivated, and the
`forced_mode = 'separate'` ones were the superseded `onboarding-*` templates —
the canonical `activity-workouts` row sets no mode. So mode is always the
user's choice, which is exactly why this note has to read off `S.mode`.)

```js
${S.locArea === 'other' ? `<div class="soft" style="font-size:12px;color:var(--pmuted);line-height:1.5;">${
  S.mode === 'together'
    ? "In-person sessions start in the Colombo area. You can still be matched now if you're open to <b>Separately, together</b> &mdash; same commitment, your own place."
    : "<b>Separately, together</b> works anywhere in Sri Lanka. You and your partner keep the same commitment in your own places, so your district doesn't limit who you match with."
}</div>` : ''}
```

So: `separate` and `either` get the honest positive message; only `together`
gets the constrained one. The headline sub-line should change too, since it
currently asserts the same thing:

```js
ttl(5,6,'Where are ','you based?','Together sessions need somewhere to meet. Separately, together works anywhere.')
```

## 1.5 The referral code must not come from the email

Current:

```js
const refCode = (S.f.email || 'friend').split('@')[0]...
```

This puts the local part of someone's email address into a URL they're asked to
share publicly. §19 already rules it out; it is also a privacy leak.

Use the `claim_token` the server returns (§3), and never show the token on
screen except inside the referral URL:

```js
const refUrl = `${location.origin}${location.pathname}?ref=${S.claimToken}`;
```

## 1.6 Minor

- Age labels: the app says `18 to 24`, the prototype `18–24`. Values match, so
  this is cosmetic — align it for consistency.
- `submitRecord()` and its `localStorage` block are replaced wholesale by §5.
- Add a honeypot: a visually hidden `<input name="website">`. Any submission
  with it filled is dropped server-side, silently.

## 1.7 Two fields to add: time of day, and a phone number

### Time of day — a hard filter you are not collecting

`features/challenges/matching.ts:358`:

```
if (a.timeOfDay && b.timeOfDay && a.timeOfDay !== b.timeOfDay)
  return 'different time of day';
```

For an in-person pair this is as decisive as location. Two runners in Cinnamon
Gardens, same activity, same mode, blocked outright because one runs at 6am and
the other at 7pm. For `separate` pairs it still scores (`scoreTimeOfDay`,
weight 15).

The five slots are `SLOT_ORDER` at `matching.ts:535`:

```js
// matching.ts SLOT_ORDER. Multi-select here: see the note below.
const TIMES = [
  ['early_morning','Early morning'],
  ['morning','Morning'],
  ['afternoon','Afternoon'],
  ['evening','Evening'],
  ['night','Night'],
];
```

**Multi-select, unlike the app.** The app stores one slot and blocks unless the
two are equal. That is harsher than reality — someone who can do mornings
*or* evenings is matchable with both camps, and in a pool this thin that is the
difference between a pair and none. Collect the set; narrow to one at claim
time.

Put it on the **mode screen (step 4)**, under the three choices — same
screen, no extra step, and it is the other half of the same question: how will
this actually happen. No cap, at least one required:

```js
<div class="sect">When do you usually go?</div>
<div class="prow">${TIMES.map(([v,l]) => {
  const on = S.times.includes(v);
  return `<button class="pillcard ${on?'on':''}" data-act="time" data-v="${v}"
          style="flex:0 1 auto;"><div class="t">${l}</div></button>`;
}).join('')}</div>
<div style="font-size:11.5px;color:var(--pmuted);line-height:1.5;">Pick as many as
work for you &mdash; more options means more people we can pair you with.</div>
```

```js
// in S:  times: [],
case 'time': {
  const i = S.times.indexOf(v);
  if (i >= 0) S.times.splice(i, 1); else S.times.push(v);
  break;
}
```

Gate Continue on `S.mode && S.times.length`.

### Phone number — optional, on step 1

Email reply rates for "we may have found someone" will be low. One optional
field beside the email, so it is captured by the step-1 save (§1.8) and
survives an abandon:

```js
<div class="fld"><label for="f-phone">Phone <span style="color:var(--pmuted);font-weight:400;">optional</span></label>
  <input class="txt" id="f-phone" type="tel" inputmode="tel" placeholder="07X XXX XXXX" value="${esc(S.f.phone)}" autocomplete="tel"></div>
```

Normalise to E.164 before sending, leniently — accept `07XXXXXXXX`,
`+947XXXXXXXX`, or anything with spaces in it:

```js
function normalisePhone(v){
  const d = String(v||'').replace(/[^0-9+]/g,'');
  if (!d) return null;
  if (d.charAt(0) === '+') return d;
  if (d.charAt(0) === '0')  return '+94' + d.slice(1);
  if (d.slice(0,2) === '94') return '+' + d;
  return d;
}
```

**It is a separate purpose under the PDPA.** The contact consent line must name
it: *"I agree to be contacted by Choner by email or phone."* Do not take a
number under a consent that only mentions email.

Not asked: **bike access.** It is a hard filter for cycling
(`matching.ts:339`), so a cycling pair can still fail on it inside the app.
A deliberate call — one fewer conditional field, and you can ask the
handful of cyclists directly.

**Source** needs no new UI: it is already in the schema, and the client payload
reads `?src=` from the URL (§3, §5).

## 1.8 Save at step 1, not at Finish

Currently the insert happens only on `finish`. Someone who gives you their
name, email and goal and then abandons at step 4 is **lost entirely** — and
that is the most expensive loss there is, because the personal outreach to get
them there is already spent.

Call the endpoint twice: once after step 1, once at `finish`. The RPC's
`on conflict (email) do update` already handles it exactly as written, and the
second call returns the same code as the first.

```js
case 'next-t1':
  submitRecord().catch(()=>{});   // fire and forget: never block the step
  go('struggle');
  return;
```

For this to work the quiz columns must be nullable. They are, except
`primary_goal`, which is collected at step 1 anyway. An abandoned row then has
a name, an email, a goal and possibly a phone, and no activity. That is still a
lead, and it is worth having.

---

# 2. App-side migration — Mattegoda

Kottawa needs nothing; it is already there. Mattegoda is genuinely absent from
`public.locations` and must be added before the web app can reference it,
because §3 puts a foreign key on that column.

`supabase/migrations/202610051200_add_mattegoda.sql`:

```sql
-- Mattegoda was missing from the Greater Colombo list. Added for The First 200,
-- where it has to exist before a registration can reference it.
insert into public.locations (value, label, location_group, sort_order)
values ('mattegoda', 'Mattegoda', 'greater_colombo', 68)
on conflict (value) do nothing;

-- Greater Colombo was inserted in alphabetical order and appending breaks it,
-- so renumber the group by label. Idempotent: re-running changes nothing.
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
```

Greater Colombo becomes 43 areas, 70 in total. Note that the renumber moves
`kotte` ("Sri Jayawardenepura Kotte") down to the S's, which is where its label
belongs. Nothing reads `sort_order` except the picker's default ordering, and
`find/form.tsx` filters by label anyway.

---

# 3. Database

Same Supabase project as the app. §10 and §11 need these rows to join to real
accounts later; a second project turns that into a manual import.

**Not in `profiles`** — `profiles.id` is a FK to `auth.users(id)` and these
people have no auth user yet.

**Written: `supabase/migrations/202610061200_first_200_registrations.sql`.** It
carries everything in this section plus §7's launch-day pieces. The SQL below
is the explanation; the migration is the authority.

```sql
create extension if not exists citext;

create table public.prelaunch_registrations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  full_name   text not null,
  email       citext not null unique,
  phone       text,          -- E.164, optional; consent_contact must cover it

  -- the quiz, in the app's own vocabulary (features/onboarding/constants.ts)
  primary_goal   text not null check (primary_goal in
                   ('move_more','sleep_better','reduce_stress','improve_energy')),
  main_struggle  text check (main_struggle in
                   ('start_but_stop','lack_accountability','too_busy','overwhelmed')),
  age_range      text check (age_range in ('18-24','25-34','35-44','45-54','55+')),
  gender         text check (gender in ('male','female','prefer_not_to_say')),

  -- the two fields that decide whether a match is possible at all
  mode         text check (mode in ('together','separate','either')),

  -- multi-select, unlike the app's single time_of_day. A hard filter for
  -- in-person pairs (matching.ts:358), so collected as a set here and
  -- narrowed to one slot at claim time.
  times_of_day text[] not null default '{}',
  constraint times_valid check (
    times_of_day <@ array['early_morning','morning','afternoon','evening','night']),

  location     text references public.locations(value),  -- Colombo area slug
  district     text,                                      -- elsewhere in SL
  -- the six ACTIVE templates only. The app's own constraint also permits
  -- 'badminton', whose template is is_active = false, so it is excluded here
  -- rather than accepted and then unusable.
  activity_key text check (activity_key in
                 ('running','jogging','walking','cycling','yoga','home_workouts')),

  -- up to four, Workouts only. text[] to match user_challenges.exercises,
  -- which is free text by design (202610011050).
  exercises text[] not null default '{}',
  constraint exercises_cap check (cardinality(exercises) <= 4),
  constraint exercises_only_workouts check (
    cardinality(exercises) = 0 or activity_key = 'home_workouts'),

  -- AT MOST one, not exactly one: the step-1 save (§1.8) has neither yet.
  constraint one_place check (num_nonnulls(location, district) <= 1),

  -- identity. The token is secret and goes in links; the code is spoken aloud.
  claim_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  access_code text not null unique default public.gen_access_code(),

  referred_by uuid references public.prelaunch_registrations(id),

  -- two consents, recorded separately. PDPA: manual matching is its own purpose.
  consent_contact boolean not null default false,
  consent_match   boolean not null default false,

  -- the launch handshake
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,

  -- the form posts twice (§1.8), so this is what stops two welcome emails
  welcome_sent_at timestamptz,

  source text,   -- 'whatsapp', 'running_club', ...
  notes  text    -- yours, for manual matching
);

create index on public.prelaunch_registrations (activity_key, mode, location);
create index on public.prelaunch_registrations (created_at desc);
```

**The code generator.** Same alphabet as the app's invite codes (no I, L, O, 0,
1), but prefixed `F2-` so the two are never confused — see §9 of the initiative
doc, and note the app's own invite code is also six characters, which is exactly
why a visible prefix is needed:

```sql
create or replace function public.gen_access_code()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text; i int;
begin
  loop
    code := 'F2-';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.prelaunch_registrations where access_code = code);
  end loop;
  return code;
end $$;
```

`random()` is fine here: the code is a human fallback behind an
authentication wall (§7). The `claim_token`, which travels in links, uses
`gen_random_bytes` and is cryptographically random.

## 3.1 RLS — the part that must not be got wrong

```sql
alter table public.prelaunch_registrations enable row level security;
-- and no policies at all.
```

**Zero policies is the design.** With RLS on and nothing granted, `anon` and
`authenticated` can neither read nor write the table; only `service_role` can.
All access goes through the two functions below.

This matters because **your anon key ships inside the page's JavaScript.** With
a naive `insert` policy you would also need `select` for the client to read back
its own code — and a `select` policy makes 200 people's email, gender, age band
and area publicly downloadable, along with every claim token. The RPC returns
only the new row's code and token, so no read grant is ever needed.

```sql
create or replace function public.register_prelaunch(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ref uuid; v_code text; v_token text; v_send boolean;
begin
  if coalesce(p->>'website','') <> '' then      -- honeypot
    return jsonb_build_object('ok', true);       -- lie to the bot
  end if;

  if nullif(p->>'ref','') is not null then
    select id into v_ref from prelaunch_registrations where claim_token = p->>'ref';
  end if;

  insert into prelaunch_registrations (
    full_name, email, phone, primary_goal, main_struggle, age_range, gender,
    mode, times_of_day, location, district, activity_key, exercises,
    consent_contact, consent_match, referred_by, source
  ) values (
    nullif(trim(p->>'full_name'),''), lower(trim(p->>'email')),
    nullif(trim(p->>'phone'),''),
    p->>'primary_goal', p->>'main_struggle', p->>'age_range', p->>'gender',
    p->>'mode',
    coalesce(array(select jsonb_array_elements_text(p->'times_of_day')), '{}'),
    nullif(p->>'location',''), nullif(p->>'district',''),
    p->>'activity_key',
    coalesce(array(select jsonb_array_elements_text(p->'exercises')), '{}'),
    coalesce((p->>'consent_contact')::boolean, false),
    coalesce((p->>'consent_match')::boolean, false),
    v_ref, nullif(p->>'source','')
  )
  -- A second submission keeps the original code. EVERY field coalesces
  -- against what is stored: the form saves twice (§1.8), and someone who
  -- comes back and re-does step 1 must not have their finished answers wiped
  -- by a payload that does not carry them yet. Written out in full in
  -- supabase/migrations/202610061200_first_200_registrations.sql.
  on conflict (email) do update set
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, prelaunch_registrations.phone),
    primary_goal = excluded.primary_goal,
    main_struggle = excluded.main_struggle, age_range = excluded.age_range,
    gender = excluded.gender, mode = excluded.mode,
    times_of_day = excluded.times_of_day,
    location = excluded.location, district = excluded.district,
    activity_key = excluded.activity_key, exercises = excluded.exercises,
    consent_contact = excluded.consent_contact,
    consent_match = excluded.consent_match
  returning access_code, claim_token,
            (activity_key is not null and welcome_sent_at is null)
    into v_code, v_token, v_send;

  return jsonb_build_object('ok', true, 'access_code', v_code,
                            'claim_token', v_token, 'should_send_welcome', v_send);
end $$;

-- Called by the Edge Function only after Resend accepts the message, so a
-- failed send leaves welcome_sent_at null and the next save retries it.
create or replace function public.mark_welcome_sent(p_token text)
returns void language sql security definer set search_path = public as $$
  update prelaunch_registrations set welcome_sent_at = now()
   where claim_token = p_token and welcome_sent_at is null;
$$;

revoke all on function public.mark_welcome_sent(text) from public;

revoke all on function public.register_prelaunch(jsonb) from public;
grant execute on function public.register_prelaunch(jsonb) to anon;
```

Optional, only if you decide to show a counter — and don't, until the number
flatters you:

```sql
create or replace function public.prelaunch_count()
returns int language sql security definer set search_path = public
as $$ select count(*)::int from prelaunch_registrations $$;
grant execute on function public.prelaunch_count() to anon;
```

---

# 4. Email

**#96 is a hard prerequisite.** The confirmation email and the app's
verification email go through the same provider on the same domain, so this is
one job that unblocks both.

1. Resend (free tier: 3,000/month) with a verified `choner.io` sender.
2. **SPF, DKIM and DMARC on `choner.io`.** Without these it is filtered
   whatever provider sends it.
3. Set it as the custom SMTP provider in Supabase → Auth → Email, which fixes
   #96 at the same time.
4. An **unsubscribe link** in every First 200 email. §21 is a recurring loop;
   without one you will be marked as spam, and that reputation damage lands on
   the same domain your auth emails use.

The confirmation email needs exactly one job: carry the code. Subject
*"You're one of The First 200"*, the code large and selectable, and one line
saying the app will ask for it.

---

# 5. Wiring the form

**Written: `supabase/functions/register-first-200/`** (`index.ts` and
`email.ts`). Deploy with:

```bash
supabase functions deploy register-first-200 --no-verify-jwt
supabase secrets set RESEND_API_KEY=re_xxx MAIL_FROM="Choner <hello@choner.io>"
```

`--no-verify-jwt` is required — registrants are not signed in.

It is the single entry point rather than calling the RPC from the browser:

```
POST /functions/v1/register-first-200
  → validate + honeypot
  → service-role call to register_prelaunch()
  → Resend: send the code
  → { access_code, claim_token }
```

Three reasons: the Resend API key never reaches the browser, there is one place
to add Cloudflare Turnstile later, and the anon key needs no grant at all.

Client side, replace `submitRecord()`:

```js
async function submitRecord(){
  const r = await fetch(ENDPOINT, {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({
      full_name:S.f.name, email:S.f.email, phone:normalisePhone(S.f.phone),
      primary_goal:S.goal,
      main_struggle:S.struggle, age_range:S.age, gender:S.gender, mode:S.mode,
      times_of_day:S.times,
      location: S.locArea==='colombo' ? S.location : null,
      district: S.locArea==='other'   ? S.location : null,
      activity_key:S.activity,
      exercises: S.activity === 'home_workouts' ? S.exercises : [],
      consent_contact:S.consent, consent_match:S.consent,
      ref:S.ref, source:new URLSearchParams(location.search).get('src') || null,
      website:'',   // honeypot
    }),
  });
  const j = await r.json();
  if (!r.ok || !j.ok) throw new Error(j.error || 'Could not save that.');
  S.accessCode = j.access_code;
  S.claimToken = j.claim_token;
}
```

`finish` must await it and show a failure rather than navigating to a
confirmation that lies:

```js
case 'finish':
  S.busy = true; render();
  try { await submitRecord(); go('confirm'); }
  catch (e) { S.busy = false; S.submitErr = e.message; render(); }
  return;
```

The prototype currently calls `submitRecord()` and navigates unconditionally.
**That must change** — a confirmation screen after a failed insert is the one
bug that would cost you real registrations silently.

**Consent:** the single checkbox currently covers both columns. If you want the
PDPA separation to be real, make it two lines — "contact me about Choner" and
"use my answers to look for a partner". The second is what §12 actually needs,
and it is a different purpose in law.

---

# 6. Hosting — Namecheap

**Create `join.choner.io` as a subdomain in cPanel and upload one file.** No new
account, no new DNS provider, nothing more to pay for.

An earlier draft recommended Cloudflare Pages. **That was over-engineering for a
single static HTML file.** Namecheap's shared hosting is cPanel with AutoSSL,
which issues and renews Let's Encrypt certificates on its own, so the "manual
certs" objection does not apply. Atomic deploys and preview URLs are genuine
advantages of Pages and are worth close to nothing for one page you will edit
perhaps ten times.

### Check this first — it is the one thing that catches people out

Namecheap sells the **domain** and the **hosting** separately, and a lot of
domains are registered there while pointing somewhere else. Open Namecheap →
Domain List → `choner.io` → **Nameservers**:

- **"Namecheap Web Hosting DNS"** — cPanel owns the DNS. Creating the
  subdomain does everything in one step. Go to the steps below.
- **"Namecheap BasicDNS"** (or anything else) — cPanel will create the folder
  but **nothing will resolve**. You must also add the DNS record yourself:
  Advanced DNS → Add New Record → **A Record**, host `join`, value = your
  hosting IP (cPanel → right sidebar → *Shared IP Address*), TTL automatic.

Getting this wrong looks exactly like "the subdomain is broken", and it is the
single most common reason a Namecheap subdomain appears dead.

### Steps

1. cPanel → **Domains** → Create a New Domain → `join.choner.io`. It makes the
   document root, usually `/home/<user>/join.choner.io`.
2. If your nameservers are BasicDNS, add the A record as above, then wait for
   it to resolve (usually minutes, up to a few hours).
3. cPanel → **SSL/TLS Status** → tick the subdomain → **Run AutoSSL**. It only
   works once the name resolves, which is why this is step 3 and not step 2.
4. Upload `index.html` into that folder — File Manager, or FTP.
5. Open `https://join.choner.io` and confirm the padlock.

### Two shared-hosting gotchas worth pre-empting

**Caching.** cPanel often serves HTML with a long `Cache-Control`, so someone
who opened the form yesterday can get the stale version today — and on a form
you will iterate on daily, that is a silent data problem. Drop a `.htaccess`
beside the file:

```apache
<FilesMatch "\.html$">
  Header set Cache-Control "no-cache, must-revalidate"
</FilesMatch>
```

**CORS.** The Edge Function must return
`Access-Control-Allow-Origin: https://join.choner.io` and answer the `OPTIONS`
preflight. It already does — `join.choner.io` is in its allowlist. If you
host anywhere else, add that origin to `ALLOWED_ORIGINS` in
`supabase/functions/register-first-200/index.ts` or the form will fail
silently.

### Later, when the app ships

Universal links are a month-three concern — a deep link cannot open an app
that is not installed. When you get there, drop
`apple-app-site-association` and `assetlinks.json` into a `.well-known` folder.
The one catch is that the Apple file has **no extension** and must be served as
`application/json`:

```apache
<Files "apple-app-site-association">
  ForceType application/json
</Files>
```

Serve them from the host you want the app to claim — `choner.io` is the better
long-term choice, since that is where marketing links will live.

**What keeps this reversible:** the access code is the durable identity, the URL
is disposable. Moving to `choner.io/join` later costs one redirect rule instead
of 200 broken links — which is the same reason §8's priority is inverted in
§7.

---

# 7. Launch day — the smallest thing that works

**Code primary, link later.** §8 makes the personal link primary, but the link
is the harder half and it cannot work before the app is installed.

```sql
alter table public.profiles
  add column if not exists is_first_200 boolean not null default false;

create or replace function public.claim_prelaunch(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.prelaunch_registrations;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into r from prelaunch_registrations
   where access_code = upper(trim(p_code)) or claim_token = trim(p_code);

  if r.id is null            then raise exception 'code_not_found'; end if;
  if r.claimed_by is not null then raise exception 'code_already_claimed'; end if;

  update prelaunch_registrations
     set claimed_by = auth.uid(), claimed_at = now() where id = r.id;
  update profiles set is_first_200 = true where id = auth.uid();

  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.claim_prelaunch(text) to authenticated;
```

Requiring authentication **is** the rate limit: brute-forcing a six-character
code costs an account per attempt.

App-side, that's one screen — a code field and a success state — plus the badge.
It is small, but it is *app* work competing with the Find landing rebuild, so
**put it on the plan now.** If launch day cannot recognise these people, the
initiative was an email list.

## 7.1 ONE code field, not two — decided 14 October 2026

There are two codes in this product and they are different lengths, which is a
launch-day trap that was found a month early rather than on the day.

| | Format | Length | What it does |
|---|---|---|---|
| **First 200 access code** | `F2-` + 6 | **9** | Proves you were one of the first 200 |
| **App invite code** | activity prefix + 3 | **6** | Invites one friend to your challenge |

`app/invite/code.tsx` today says *"Enter the **6-character** code from your
friend's message"* with placeholder `e.g. RUN4K7`. Someone holding `F2-8ESUV5`
would type it there, be rejected, and conclude their code was fake. Two hundred
people, on the one day it matters most, with no obvious diagnosis.

**DECIDED: one field that accepts both, routing on the `F2-` prefix.** Not two
entry points, and not dropping the prefix to make the lengths match.

The prefix exists precisely so the two can be told apart in code, which makes
this safe: `F2-` cannot collide with an activity prefix, because the invite
alphabet has no digits in that position. So the test is unambiguous:

```ts
const entered = raw.trim().toUpperCase();
if (entered.startsWith('F2-')) {
  // claim_prelaunch(entered)  -> sets is_first_200, no challenge joined
} else {
  // the existing invite path  -> /invite/<code>
}
```

**Why not two separate screens.** It doubles the surface, and it asks the user
to classify their own code before they can use it — which is the thing they
cannot do, since both arrived by email and both are just "my code".

**Why not drop the `F2-` prefix.** It would make both six characters and one
field trivially handle them, but then the two namespaces collide: a First 200
code could be a valid invite code, and the app could not tell which the person
meant. The prefix is the cheapest possible discriminator and it is already
printed on 200 codes-to-be.

**Copy must change too.** "Enter the 6-character code" becomes something that
does not contradict a 9-character code in the user's hand. "Enter your code"
with a placeholder showing both shapes, or no length claim at all.

**Done when:** `F2-8ESUV5` and `RUN4K7` both work in the same field, and the
wrong-but-well-formed code of each type gives a clear message rather than
"not found".

---

# 8. Marketing, in one line

Lead with **"Separately, together."** From §1.4's reasoning: `separate` mode has
no geographic constraint, and every one of the six activities leaves the choice
open, so it is where a cold start actually gets solved —
roughly 17 pairs from 60 registrations, against 3–5 for `together` spread over
even three adjacent areas. It is also the easier sell: no scheduling, no venue,
no safety question.

Then hand-build 3–5 `together` pairs in **one** area — Colombo 5, 6 and 7 are
contiguous and all have running routes. Not for volume, but because
together-mode pairs should retain better, and that is what you most need to
learn.

**Track pairs, not registrations.** 60 people giving 17 pairs beats 200
scattered giving 15.

---

# 9. Do not build

- **The onboarding prefill.** Capture everything, prefill nothing yet.
  Re-asking seven questions costs less than a half-tested claim pipeline on
  launch day. The data is stored, so this is a clean v2.
- **Match-proposal tables or a status pipeline.** §24 says do it manually, so
  the Supabase table editor *is* the admin tool. `notes` and the indexes are
  there for exactly that.
- **Any admin UI.**
- **A public counter**, until the number flatters you.

---

# 10. Order

| | | |
|---|---|---|
| 1 | Resend + SPF/DKIM/DMARC, set as Supabase SMTP | unblocks #96 too |
| 2 | Mattegoda migration (§2) | must precede the FK in §3 |
| 3 | Table, `gen_access_code`, RLS, `register_prelaunch` (§3) | |
| 4 | Prototype corrections (§1) — activities, locations, drop `t2offer`, the mode-conditional copy, the referral token, the await-before-navigate fix | |
| 5 | Edge Function + wiring (§5) | |
| 6 | `join.choner.io` subdomain in cPanel, AutoSSL, upload (§6) | 15 min |
| 7 | `claim_prelaunch` + the code screen + badge (§7) | app work — schedule it |

Items 1–6 are the web app and are independent of the app's own remaining work
in `docs/OUTSTANDING_WORK.md`. Only item 7 competes with it.
