// Automatic partner matching.
//
// Runs the REAL scoring — this imports features/challenges/matching.ts rather
// than reimplementing it. PARTNER_MATCHING.md is explicit that a second copy of
// the rules would drift from the tested one, and a matcher nobody can trust is
// worse than no matcher. The CLI (scripts/match-pool.js) calls this same
// function, so there is exactly one implementation and one code path.
//
// CONSENT
//
// Only people who tapped "Find a partner" are ever considered. partner_match_requests
// exists only because join_match_pool() inserted a row when the user asked for
// it; somebody who never asked has no row and cannot be matched. Declining a
// match puts you back in the pool deliberately (decline_match does that), and
// leave_match_pool takes you out for good.
//
// Nothing here confirms anything. A match is written as 'pending' and both
// people still have to say yes in the app before the pairing goes live.
//
// Required secrets:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Auth: uses the service role and trusts its caller, exactly like send-push —
// make sure it is only reachable with the function key or from inside Supabase.
//
// Body (all optional):
//   { dryRun?: boolean, userId?: string, minScore?: number, limit?: number }
//
//   dryRun   score and explain, write nothing
//   userId   solve for ONE person: score them against the whole pool and return
//            their best options. Without it, the pool is optimised as a whole.
//   minScore override DEFAULT_MIN_SCORE
//   limit    cap how many pairings are written

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  matchPool,
  scorePair,
  DEFAULT_MIN_SCORE
} from '../../../features/challenges/matching.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// The pool rows carry a few fields the scorer ignores but the blurbs need.
interface PoolCandidate {
  userId: string;
  challengeTemplateId: string;
  fullName?: string;
  city?: string | null;
  style?: string;
  habit?: string;
  reflections?: { custom_text?: string | null }[];
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// Blurbs
//
// One curated line about each person, written at pairing time. Never their raw
// reflections: until both sides confirm, these two are strangers. Their own
// words are used where they wrote some, cut to a single sentence; otherwise we
// say only what can be said without quoting them.
// ---------------------------------------------------------------------------

const STYLE_BLURB: Record<string, string> = {
  competitive: 'is here for a bit of friendly rivalry',
  momentum: 'hates breaking a streak',
  encouraging: 'responds to warmth rather than pressure',
  team: 'is the type who shows up for other people'
};

function blurbFor(c: PoolCandidate): string {
  const first = String(c.fullName ?? 'They').trim().split(/\s+/)[0];
  const ownWords = (c.reflections ?? [])
    .map((r) => (r.custom_text ?? '').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0];

  if (ownWords) {
    const sentence = ownWords.split(/(?<=[.!?])\s/)[0].replace(/[.\s]+$/, '');
    const trimmed = sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence;
    return `${first} said: "${trimmed}."`;
  }

  const style = STYLE_BLURB[String(c.style)] ?? 'is getting started';
  const where = c.city ? ` Based in ${c.city}.` : '';
  return `${first} ${style}.${where}`;
}

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  let body: { dryRun?: boolean; userId?: string; minScore?: number; limit?: number } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const minScore = body.minScore ?? DEFAULT_MIN_SCORE;
  const dryRun = body.dryRun === true;

  const { data: pool, error } = await admin.rpc('get_match_pool');
  if (error) {
    console.error('get_match_pool failed', error);
    return new Response(error.message, { status: 500 });
  }

  const candidates = (pool ?? []) as PoolCandidate[];
  if (candidates.length === 0) {
    return Response.json({ ok: true, pool: 0, proposed: 0, written: 0, pairs: [] });
  }

  const byId = new Map(candidates.map((c) => [c.userId, c]));
  const now = Date.now();

  let pairs;
  let unmatched: string[] = [];

  if (body.userId) {
    if (!byId.has(body.userId)) {
      return Response.json(
        { ok: false, reason: 'not_in_pool', userId: body.userId },
        { status: 404 }
      );
    }
    // Solve FOR this person rather than filtering a global assignment: someone
    // who just joined has no fairness boost and would watch every viable
    // partner get claimed by an established pair before their turn.
    const me = byId.get(body.userId)!;
    pairs = candidates
      .filter((c) => c.userId !== body.userId)
      // deno-lint-ignore no-explicit-any
      .map((c) => scorePair(me as any, c as any, now))
      .filter((r) => !r.blocked && r.score >= minScore)
      .sort((x, y) => y.score - x.score);
  } else {
    // deno-lint-ignore no-explicit-any
    const result = matchPool(candidates as any, minScore, now);
    pairs = result.pairs;
    unmatched = result.unmatched;
  }

  if (typeof body.limit === 'number') pairs = pairs.slice(0, body.limit);
  // One person gets one partner, however many were ranked for review.
  const toWrite = body.userId ? pairs.slice(0, 1) : pairs;

  // Telling people is what makes matching feel instant.
  //
  // Writing the match takes ~40ms, but nothing informed the app, so it only
  // noticed on its next poll or when something else happened to invalidate the
  // query -- and the onboarding screen has always promised "we'll notify you
  // the moment you're matched" while sending nothing at all. notifications is
  // in the realtime publication and the client already subscribes to it, so one
  // row both delivers the promise and wakes the UI immediately. It also reaches
  // someone who has put their phone down, which no amount of polling does.
  async function announce(toUser: string, otherName: string, habit: string) {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: toUser,
          kind: 'partner_matched',
          title: 'We found your partner',
          body: `${otherName} is doing ${habit} too — say yes to start.`,
          route: '/(tabs)/find'
        })
      });
    } catch (err) {
      // Never fatal: the pairing is already written, and the app still picks it
      // up on its next poll. A failed announcement must not undo a good match.
      console.error('match announcement failed', err);
    }
  }

  const firstName = (n?: string) => String(n ?? 'Someone').trim().split(/\s+/)[0];

  let written = 0;
  const skipped: string[] = [];

  if (!dryRun) {
    for (const pair of toWrite) {
      const a = byId.get(pair.a)!;
      const b = byId.get(pair.b)!;
      const { data: ok, error: wErr } = await admin.rpc('create_partner_match', {
        p_user_a: pair.a,
        p_user_b: pair.b,
        p_template: a.challengeTemplateId,
        p_blurb_a: blurbFor(a),
        p_blurb_b: blurbFor(b)
      });
      if (wErr) {
        console.error('create_partner_match failed', wErr);
        continue;
      }
      // false means somebody was claimed between reading the pool and writing —
      // an ordinary race between the cron and a manual run, not an error.
      if (ok) {
        written++;
        const habit = String(a.habit ?? 'the same habit');
        await Promise.all([
          announce(pair.a, firstName(b.fullName), habit),
          announce(pair.b, firstName(a.fullName), habit)
        ]);
      } else skipped.push(`${pair.a}+${pair.b}`);
    }
  }

  return Response.json({
    ok: true,
    pool: candidates.length,
    proposed: pairs.length,
    written,
    skipped,
    unmatched: unmatched.length,
    dryRun,
    pairs: pairs.map((p) => ({
      a: p.a,
      b: p.b,
      aName: byId.get(p.a)?.fullName,
      bName: byId.get(p.b)?.fullName,
      aCity: byId.get(p.a)?.city,
      bCity: byId.get(p.b)?.city,
      habit: byId.get(p.a)?.habit,
      score: p.score,
      aSignal: p.aSignal,
      bSignal: p.bSignal,
      reasons: p.reasons
    }))
  });
});
