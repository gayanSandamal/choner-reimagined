# Partner Matching (v1)

**Code:** `features/challenges/matching.ts` · **Tests:** `features/challenges/matching.test.ts`
**Origin:** rule-based v1 by Dinesh Doluweera, Aug 2026, adapted to the app's data model.
**Status:** rule-based, no ML. Decision support for concierge matching — nothing auto-pairs.

---

## Run it

```bash
npm test -- matching
```

Zero runtime dependencies, no network, no Supabase client. Pure TypeScript, safe to
call from a script, an edge function, or a test.

---

## What it does

Takes a pool of people waiting for a partner and returns pairings plus a list of who
is still unmatched.

```ts
import { matchPool } from '@/features/challenges/matching';

const { pairs, unmatched } = matchPool(candidates);
// pairs: [{ a, b, score: 82, aSignal: 91, bSignal: 46, reasons: [...] }]
```

Every pairing carries `reasons` — plain-English explanations of why it scored what it
did — and both commitment signals. That is what makes a match reviewable by a human,
and it is the record we learn from later.

**This does not write to the database.** `partner_match_requests` is readable only
server-side (RLS gives each user their own row and nothing else), and pairing is still
a person inserting a `partner_matches` row. This module ranks and explains; a human
still decides.

### Building a `Candidate`

| `Candidate` field | Comes from |
|---|---|
| `userId` | `partner_match_requests.user_id` |
| `challengeTemplateId` | `partner_match_requests.challenge_template_id` |
| `isCustomHabit` | `user_challenges.custom_habit_title is not null` |
| `durationDays` | `challenge_templates.duration_days` |
| `style` | the onboarding tone (`ToneValue`) on the profile |
| `reflections` | the user's `challenge_reflections` rows |
| `timezone` | `profiles.timezone` (IANA, e.g. `Asia/Colombo`) |
| `city` | `profiles.city` |
| `joinedPoolAt` | `partner_match_requests.created_at` as epoch ms |
| `previouslyUnmatchedWith` | `partner_matches` rows for this user with status `declined` / `expired` |

---

## The core idea

The first 9 concierge pairs all had the same shape: **one person was clearly more
committed and pulled the other along.** Nobody succeeded as two equally-unmotivated
people.

So this does **not** match people who are similar. It looks for *productive asymmetry* —
one anchor, one person who needs anchoring.

Consequence worth understanding: **two highly-committed people score lower than an
asymmetric pair.** That is intentional. Two strong people will likely succeed with or
without us; pairing them together spends two anchors on each other when each could have
carried someone who actually needed it.

The worst case — two low-signal people — is penalised heavily and usually left
unmatched instead.

---

## How commitment is measured

We do **not** ask people to rate their own commitment. Self-ratings are unreliable and
easy to game. We infer it from effort on the Why reflection (Step 2 of challenge setup):

| Signal | Weight | Reasoning |
|---|---|---|
| Questions answered in their own words | 40 pts | Typing takes effort. Effort correlates with intent. |
| Total length of those words | 35 pts | Specific, longer answers indicate real thought |
| How many of the 4 questions were answered at all | 25 pts | Completion is a baseline signal |

Output is 0–100. Four questions answered richly in their own words → 100. Four chips
tapped → 25. Nothing filled in → 0.

Two details that follow from how reflections are actually stored:

- **Only the user's own text counts toward length.** A tapped chip carries canned copy
  we wrote; measuring its length would score our prose, not their effort.
- **"Something else" with an empty text field is a skipped question,** exactly as
  `isAnswered()` treats it everywhere else in the app.

**This is a proxy, not a truth.** It measures effort on a form, not commitment. Someone
genuinely motivated but in a hurry scores low. It is the best signal we have without
outcome data, and the first thing worth replacing once we have some.

---

## Hard rules (reject outright)

- Same user
- Different habit — a shared streak only means something if the commitment is identical
- Either habit is custom — nobody else picked "30 sit-ups"
- Different duration
- Previously paired and it didn't work out (checked from both sides)
- Timezone gap > 5 hours — daily check-ins stop overlapping meaningfully

An **unknown** time zone does not block. We can't prove the days overlap, so the pair
simply gets none of the 25 proximity points and the reason says so.

---

## Soft rules (produce the score)

| Rule | Max points | Notes |
|---|---|---|
| Commitment asymmetry | 35 | Sweet spot is a 15–55 point gap |
| Both low commitment | −40 | Penalty. The known failure case. |
| Style compatibility | 20 | Competitive + Encouraging is a known clash |
| Timezone proximity | 25 | Closer = better, scaling down to the 5h limit |
| Same city | 10 | Supports the hyperlocal seeding plan |
| Waiting fairness | 10 | Kicks in after 48h so nobody is permanently passed over |

All weights live in the `WEIGHTS` object at the top of the file — tune there, not
scattered through the logic. Time zones are resolved from the IANA zone at the instant
being scored, so a DST change is reflected the day it happens.

### Style compatibility matrix

The four onboarding tones, reused as accountability styles.

|  | Competitive | Momentum | Encouraging | Team |
|---|---|---|---|---|
| **Competitive** | 1.0 | 0.8 | **0.3** | 0.6 |
| **Momentum** | 0.8 | 1.0 | 0.7 | 0.8 |
| **Encouraging** | **0.3** | 0.7 | 1.0 | 0.9 |
| **Team** | 0.6 | 0.8 | 0.9 | 1.0 |

The 0.3 is the important one: someone who picked "I need warmth, not pressure" paired
with someone who wants rivalry is a bad fit.

---

## The minimum score threshold

`matchPool(candidates, minScore = 45)`

Pairings below 45 are **not made at all** — that person stays in the pool.

This is a product decision, not a technical one: **a failed first pairing costs more
retention than a short wait.** If someone's first experience of Find-a-Partner is a
stranger who ghosts on day two, they probably don't come back. Better to say "still
looking" honestly.

Tune this as the pool grows — with more people we can afford to be pickier.

---

## Known limitations

**Greedy, not optimal.** We score all valid pairs, sort, and take the best available in
order. Maximum-weight matching (Blossom) would do marginally better. At our pool size
the difference is negligible and greedy is far easier to explain to whoever is reviewing
a pairing. Revisit if the pool gets large. Ties break on longest wait, then user id, so
the same pool always produces the same pairings regardless of row order.

**O(n²) pair scoring.** Fine for hundreds. If the pool reaches thousands, pre-bucket by
habit + duration before scoring.

**The commitment signal is a proxy.** See above. The weakest part of the system.

**No safety layer.** This matches strangers. Verification, reporting, and blocking must
exist before Find-a-Partner runs at any scale. The two-sided confirmation on
`partner_matches` is the only guard today.

---

## What to log

Every match made should record both commitment signals, the score, the reasons, and then
— critically — **the outcome**: completed / one dropped out / both dropped out, and on
which day. `MatchScore` carries the first four so they can be written down at pairing
time.

That outcome data is the entire training set for anything smarter. Without it there is
nothing to learn from. Log from the very first match, while matching is still manual.
