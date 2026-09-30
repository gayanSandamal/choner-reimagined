# Challenges — the schema, agreed in writing

**For Gayan. Read this before starting anything on the "Do not start" list.**

Your own note said it: *"When these unfreeze, agree the schema in writing before
either person starts. The churn in this project has been in the data model, not
the UI."* This is that agreement.

It comes out of a full walk of the Challenges prototype on 29 September — 22
states, 6 groups. Every decision below is settled, and the reasoning is in
`docs/DECISIONS_LOG.md` under "Challenges review, parts 1–6".

**Nothing here is built.** No migrations written yet, deliberately: agree the
shape first, then we write them.

**The five drafted migrations ARE on `main`, and none of them has been run.**
Merged 30 September:

    supabase/migrations/202609291000_reflections_own_only.sql
    supabase/migrations/202609291100_profiles_tone_column_expand.sql
    supabase/migrations/202609291110_profiles_tone_column_contract.sql
    supabase/migrations/202609291200_photo_status.sql
    supabase/migrations/202609291300_short_invite_code.sql

**So `supabase db push` will now apply all five.** That is the one thing to know
before running anything against a real database. Read them first, argue with
them, change what you disagree with — they were written to be argued with, and
two of them carry open questions that are not ours alone to settle.

The expand/contract pair is deliberately two files: run `...1100` first, let
both names stay in step, and only run `...1110` once nothing writes the old
column.

---

## 1. The model, in one page

You need this to read the rest.

**A commitment** is a weekly agreement: *"Run 2× a week, 3 km each time."* It is
the same thing `user_challenges` already is.

**A session** is one occurrence of it. Planned one at a time, by both people,
through the propose → accept / counter flow that `pair_plans` already does.

**A streak** is a target number of sessions — *"a 12 session streak"* — chosen
by the person, not the pair. It is drawn as 12 circles.

| Circle | Meaning |
|---|---|
| Solid orange | session done, both showed up |
| Marked outline | planned, the day passed, not done — a miss |
| Plain empty | ahead, not planned yet |

Four rules that between them decide most of the schema:

1. **A circle only fills when BOTH people complete the session.** Showing up
   alone earns nothing. There is no solo mode.
2. **A circle can only be missed if the session was planned.** No plan, no date,
   nothing to miss. This is why there is no schedule table and no pause logic —
   see §3.
3. **The streak is personal in ownership, shared in earning.** It is your 12 on
   your row. Your partner has their own. Both advance on the same sessions.
4. **A miss costs the circle and a debt, never the streak.** Nothing resets,
   ever. You owe one session against that week's commitment, and repair is
   choosing when to pay it.

**When a streak completes.** When all N circles have *resolved*, not when N are
filled. Resolved = filled, or missed and not repaired. The score is how many
filled, so finishing at 11 of 12 is a real outcome and the extend prompt still
appears. Requiring N filled would let an unrepaired miss silently stretch the
streak's length, and once the week's one repair is spent the streak could never
finish at all. (Behaviour only — nothing to migrate.)

---

## 2. The one new table

`partnerships`. **This is the only genuinely new thing, and it is the one that
cannot be worked around in the UI.**

Today a partner is two columns on `user_challenges` — `partner_user_id` and
`partner_state` — and `is_partner_of()` keys on exactly that
(`202609101100`). So the partnership dies with the challenge.

That is now wrong in both directions. Decided 29 September:

- **Ending a challenge does NOT end the match.** You pick a new activity and
  you are still partnered.
- **Ending a match does NOT end the challenge.** This half already worked —
  `matchEndedLine()` literally says *"Your challenge continues."*

So the partnership has to outlive the challenge row, and there is nowhere for it
to live.

```
partnerships
  id            uuid pk
  user_a        uuid not null   -- ordered pair: least(a,b), greatest(a,b)
  user_b        uuid not null   -- with a unique index on (user_a, user_b)
                                --   where state = 'active'
  state         text            -- 'active' | 'ended'
  started_at    timestamptz
  ended_at      timestamptz
  ended_by      uuid            -- who ended it
  end_reason    text            -- see §5
```

**One active partnership per person.** Not a new rule: it follows from one
active challenge per user, and a circle filling only when *both* complete. With
two partners the model cannot say which "both".

`unique (user_a, user_b) where state = 'active'` alone does NOT enforce this. It
only stops the same pair having two live rows; one person could still hold four
partnerships. It takes three guards — the pair index, plus one-sided partial
unique indexes on `user_a` and on `user_b`, both `where state = 'active'`. Even
then a person can be `user_a` in one row and `user_b` in another (X in `(X, Y)`
and in `(W, X)` with W < X < Y passes all three), so a trigger closes the
cross-side case, with an advisory lock per person so two concurrent matches
cannot both pass. Ended rows never block: someone whose partnership ended is
free to be matched again. Migration `202609301500`.

Consequence: pairing someone who is already partnered now raises inside the
write to `user_challenges`. That is correct as a backstop, but the friendly
guard (§8 item 1: block outright if already partnered) belongs in the invite
and match functions themselves.

**`partner_state` stays where it is.** Four of its five values — `solo`,
`finding`, `invited`, `matched` — are *search* states, and searching is
per-challenge. Only `partnered` describes a partnership. Leave the column alone
and let an active `partnerships` row be what `partnered` means.

**`is_partner_of()` should read `partnerships`.** It is the function storage RLS
for check-in photos depends on, so it is the thing that must not break. Same
expand/contract shape as the tone column: add the table, backfill from
`partner_state = 'partnered'`, repoint the function, verify, then stop writing
the old columns.

---

## 3. What we deliberately did NOT add

Worth stating, because the obvious design has all three and we talked ourselves
out of each one.

**No streak table.** A streak is `target_sessions` on `user_challenges` plus the
session rows that count toward it. Nothing else.

**No `end_date`, and no slot table.** A circle can only be missed if it was
planned, and sessions are planned one at a time — so there is no pre-computed
schedule to keep in sync with the calendar. The streak ends when all 12 circles
have resolved (filled, or missed and not repaired). You can finish at 11 of 12;
no deadline exists anywhere.

**No pause logic.** The rule "the schedule pauses while you have no partner"
needs no implementation: no partner means no sessions get planned, which means
nothing can be missed. It falls out of rule 2 for free.

The end date **is** shown in the UI — *"About 6 weeks at 2× a week"* — but it is
`target ÷ cadence` computed on screen, an estimate and not a fact.

---

## 4. Changes to tables you already have

### `user_challenges`

| Change | Why |
|---|---|
| **add `target_sessions int`** | the 12. Presets 10 / 20 / 30. Asked once, right after the first plan is accepted — it cannot go in the plan itself, because the plan is a negotiation and the streak is personal. |
| **`days_per_week` — fix the check constraint** | see the bug below |
| **`days_per_week` — drop `default 7`** | 7 means daily, and daily is no longer the default shape of anything |

**Live bug.** `202609181600:172` sets
`check (days_per_week in (3, 4, 5, 7))`. The product offers **1×, 2× and 3× a
week** and the prototype's own worked example is *"Run 2× a week"* — which this
constraint **rejects**. 1, 2 and 6 all fail today.

The agreed range is now **1 through 7**, where 7 is labelled *Daily* in the UI
rather than 7×. So: `check (days_per_week between 1 and 7)`.

Cadence is agreed at the **first plan**, by both people. It is not asked during
onboarding and not set when the commitment is created — the only editable field
before a match is the **activity**.

### `pair_plans`

This is the session row, so it is what a circle is.

| Change | Why |
|---|---|
| **add `'missed'` to the status check** | currently `planning, confirmed, verified, completed, cancelled, ended`. A planned session whose day passed with no check-in is a distinct outcome from `cancelled`, and it is what draws a marked circle. |
| **add `is_repair boolean default false`** | a make-up session. See §6. |
| **add `repairs_plan_id uuid`** | which missed session this one repairs — because repair **fills the missed circle**, it does not add a thirteenth. |
| **add `due_at timestamptz`** | the one deadline for the session. See below. |

**Missed is defined as:** not completed by both people by `due_at`, where
`due_at` is **the later of the two people's local midnights** after the planned
day. "Local midnight" alone never said whose, which was harmless when each
person had their own row and is not harmless now: Colombo and London are 4.5
hours apart, so for 4.5 hours the same session would be missed for one person
and still live for the other.

`due_at` is computed once, when the plan is confirmed (the second person
accepts), and again only if a confirmed session is moved. That gives the pair
one deadline, means nobody is marked missed while it is still that day where
they are, and means changing timezone later cannot move a deadline already
agreed. The sweep compares `now() > due_at` and no longer joins `profiles` for a
timezone. Migration `202609301600`, which also adds the sweep.

### `partner_matches`

**A match expires 24 hours after it is created.** One clock, started at
`created_at`, and **both people see the same number counting down** — not one
clock per person, because `pending` exists precisely when one has answered and
the other has not.

`status` already has `'expired'` in its check constraint, so this is a sweep
plus whatever surfaces the remaining time to the client. On expiry both go back
in the pool.

### `challenge_invites`

**An unused invite code expires 48 hours after it is created.** Add
`expires_at timestamptz`, and refuse acceptance past it.

Note this is **not** in the short-code migration already drafted
(`202609291300_short_invite_code.sql`) when that file was written — it was
decided afterwards. It has SINCE BEEN ADDED to that migration, as §5 of it:
the column, the backfill, the default, and a BEFORE UPDATE trigger that refuses
acceptance past it. The trigger rather than a check inside
`accept_invite_by_code`, because the deep link calls `accept_challenge_invite`
directly and the trigger is the one place both paths pass through.

The person who **receives** the code sees a line saying it expires in 48 hours.
Both parties can see the state.

This closes master spec open item 2.

---

## 5. Ending a match — a new, neutral action

**Today the only ways to end a match are `block_partner` and `report_partner`.**
Both are safety actions. Someone who simply wants out has to treat their partner
as a safety problem, and that is what this fixes.

New RPC, neutral, writing `state`, `ended_at`, `ended_by` and `end_reason` to
`partnerships`. Six reasons, stored as an enum-ish text:

| value | label |
|---|---|
| `no_time_worked` | We couldn't find a time that worked |
| `stopped_replying` | They stopped replying |
| `pace_mismatch` | Our pace or level didn't match |
| `changing_what_i_do` | I'm changing what I'm doing |
| `something_felt_off` | Something felt off |
| `prefer_not_to_say` | Prefer not to say |

**Keep these separate from `REPORT_CATEGORIES`.** Report answers *what was wrong
with this person*; this answers *why this pairing didn't work*. Note
`stopped_replying` here against `didnt_show_up` there — going quiet in the app
is not a no-show at a physical meetup.

**`something_felt_off` is a door, not an outcome.** The RPC accepts all six
reasons and ends the match; the client then offers the report flow. The server
does **not** refuse it, because refusing would mean someone who felt unsafe
cannot leave until they have filed a report — the opposite of what the reason
is for. It sits *in* the list on purpose: someone scanning for the unsafe
option who cannot find it picks "Prefer not to say" instead, and that is the
signal you most want.

**The reason is private.** The other person is told only that the match ended —
same promise `blockConfirmCopy` already makes. Nothing in any partner-facing
query should return `end_reason`.

`prefer_not_to_say` must exist. Forcing a reason out of someone leaving because
they felt unsafe is how you stop them leaving.

---

## 6. Repair

A miss does not touch the streak, but it **does** leave you owing a session
against that week's commitment. Repair is choosing when to pay it:

- **this week** — plan another before Sunday, still finish the week at 2
- **next week** — next week becomes 3× instead of 2×

Rules:

- **One repair per week, maximum.** A second miss in the same week is simply
  lost: circle marked, no debt carried.
- **An unpaid "this week" repair rolls into next week automatically.** The
  choice is a preference, not a trap.
- **If your partner missed, you BOTH owe one.** A session needs both people, so
  it did not happen for either of you.
- **The repair session fills the missed circle** — `repairs_plan_id` — so the
  row stays at 12.
- **Repair is not a separate mechanic.** It is choosing when to plan the
  make-up; the ordinary plan flow runs and the partner accepts like any other
  session. Cheap to build.

---

## 7. What ends what

The four cases, because they were wrong in the prototype in three of them:

| Event | Challenge | Partnership | Streak |
|---|---|---|---|
| Match ends | continues | ends | **kept, intact** |
| Challenge ends | ends | **continues** | **ends, saved to history** |
| Streak completes | continues | continues | extend prompt, immediately |
| Both leave | — | ends | ends |

**The streak belongs to the challenge, not the user.** 7 of 12 on Running, end
the challenge, start Cycling: the 7 goes to history and Cycling starts fresh.
This was chosen knowing it means ending a challenge destroys progress — it buys
a tidier per-activity history, and the UI warns before it happens.

The streak still survives a **partner** change, because the challenge does.

---

## 8. Still open — do not resolve silently

1. **An invitee who already has an active challenge enters a code.** End theirs,
   replace it, or block it? Recommendation was ask-then-replace, and block
   outright if already partnered. Unchanged from your task 7.
2. **What the matching wait promises** — "usually a day or two" versus
   notify-on-match.
3. **"Either works" in the Find form.** Kept, but it exists for pool size rather
   than for the person choosing it.

---

## 9. Order

1. **`partnerships`** first, with `is_partner_of()` repointed. Everything in §7
   depends on it, and it is the only change the frontend cannot fake.
2. **`days_per_week` constraint.** One line, and it is rejecting a value the
   product already offers.
3. **`target_sessions`**, `pair_plans` status and repair columns.
4. **Expiry** on both matches and invite codes.
5. **End match** RPC and reasons.

The Find-side work — the mode column and the hard-filter logic — is unchanged by
this review and still waits on the Find prototype walk.
