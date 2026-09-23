import { CUSTOM_CHOICE_KEY, ReflectionAnswer } from './reflections';
import {
  Candidate,
  DEFAULT_MIN_SCORE,
  SkillLevel,
  WEIGHTS,
  commitmentSignal,
  matchPool,
  offsetMinutesFor,
  scorePair
} from './matching';

// A fixed instant so time zone offsets and waiting times are deterministic.
// Mid-August: the northern-hemisphere zones below are on summer time.
const NOW = Date.UTC(2026, 7, 20, 9, 0, 0);
const HOURS = 60 * 60 * 1000;

type WhyDepth = 'rich' | 'thin' | 'empty';

const RICH: Record<string, string> = {
  purpose: 'I want to get back to running consistently after two years off',
  matters: 'My father had a heart attack last year and it shook me',
  gain: 'Energy, and proof to myself that I can still commit to something',
  lose: "Another year of telling myself I'll start next month"
};

// Chip taps: real answers, but no words of their own.
const CHIPS: Record<string, string> = {
  purpose: 'feel_better',
  matters: 'tried_before',
  gain: 'more_energy',
  lose: 'lost_progress'
};

const KEYS = ['purpose', 'matters', 'gain', 'lose'] as const;

/**
 * @param depth   how they answered: own words, chip taps, or not at all
 * @param written how many of the four they wrote themselves (rich only)
 */
function why(depth: WhyDepth, written = 4): ReflectionAnswer[] {
  if (depth === 'empty') return [];
  return KEYS.map((key, i) => {
    const ownWords = depth === 'rich' && i < written;
    return {
      question_key: key,
      choice_key: ownWords ? CUSTOM_CHOICE_KEY : CHIPS[key],
      custom_text: ownWords ? RICH[key] : null
    };
  });
}

function mk(userId: string, opts: Partial<Candidate> = {}): Candidate {
  return {
    userId,
    challengeTemplateId: 'run-1-mile',
    isCustomHabit: false,
    durationDays: 7,
    style: 'team',
    reflections: why('thin'),
    timezone: 'Asia/Colombo',
    city: 'Colombo',
    joinedPoolAt: NOW - 2 * HOURS,
    ...opts
  };
}

describe('offsetMinutesFor', () => {
  it('resolves an IANA zone to minutes from UTC', () => {
    expect(offsetMinutesFor('Asia/Colombo', NOW)).toBe(330);
    expect(offsetMinutesFor('UTC', NOW)).toBe(0);
    expect(offsetMinutesFor('Asia/Kathmandu', NOW)).toBe(345);
  });

  it('follows the zone at that instant, not a fixed offset', () => {
    const summer = Date.UTC(2026, 7, 20, 9);
    const winter = Date.UTC(2026, 0, 20, 9);
    expect(offsetMinutesFor('America/New_York', summer)).toBe(-240);
    expect(offsetMinutesFor('America/New_York', winter)).toBe(-300);
  });

  it('says "unknown" rather than guessing UTC', () => {
    expect(offsetMinutesFor(null)).toBeNull();
    expect(offsetMinutesFor('Mars/Olympus_Mons')).toBeNull();
  });
});

describe('commitmentSignal', () => {
  it('reads effort, not a self-rating', () => {
    expect(commitmentSignal(why('rich'))).toBe(100);
    expect(commitmentSignal(why('thin'))).toBe(25);
    expect(commitmentSignal(why('empty'))).toBe(0);
  });

  it('rises with each question they answer in their own words', () => {
    const ladder = [0, 1, 2, 3, 4].map((n) => commitmentSignal(why('rich', n)));
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i]).toBeGreaterThan(ladder[i - 1]);
    }
  });

  it('ignores the length of copy we wrote for them', () => {
    // Every chip carries canned prose of ours. Tapping four of them must not
    // score as if the user had written four sentences.
    expect(commitmentSignal(why('thin'))).toBe(25);
  });

  it('treats "Something else" with no text as a skipped question', () => {
    const blank: ReflectionAnswer[] = KEYS.map((key) => ({
      question_key: key,
      choice_key: CUSTOM_CHOICE_KEY,
      custom_text: '   '
    }));
    expect(commitmentSignal(blank)).toBe(0);
  });
});

describe('the core hypothesis: asymmetry beats two-weak', () => {
  const strongWeak = scorePair(
    mk('A', { reflections: why('rich', 3) }),
    mk('B', { reflections: why('rich', 1) }),
    NOW
  );
  const weakWeak = scorePair(
    mk('C', { reflections: why('thin') }),
    mk('D', { reflections: why('thin') }),
    NOW
  );
  const strongStrong = scorePair(
    mk('E', { reflections: why('rich') }),
    mk('F', { reflections: why('rich') }),
    NOW
  );

  it('ranks one anchor plus one who needs anchoring highest', () => {
    expect(strongWeak.score).toBeGreaterThan(strongStrong.score);
    expect(strongWeak.score).toBeGreaterThan(weakWeak.score);
    expect(strongWeak.reasons).toContain(
      'healthy commitment gap — one partner can anchor the other'
    );
  });

  it('leaves two low-signal people below the threshold', () => {
    expect(weakWeak.score).toBeLessThan(DEFAULT_MIN_SCORE);
    expect(weakWeak.reasons).toContain('both low commitment signal — high dropout risk');
  });

  it('scores two strong people lower — deliberately, they waste each other', () => {
    expect(strongStrong.score).toBeLessThan(strongWeak.score);
    expect(strongStrong.reasons).toContain('similar commitment levels — no clear anchor');
  });

  it('reports both signals so a made match can be logged with its inputs', () => {
    expect(strongWeak.aSignal).toBeGreaterThan(strongWeak.bSignal);
    expect(strongWeak.aSignal).toBe(commitmentSignal(why('rich', 3)));
  });
});

describe('hard rules', () => {
  const cases: [string, Candidate, Candidate][] = [
    ['same user', mk('G'), mk('G')],
    ['different habit', mk('G'), mk('H', { challengeTemplateId: 'yoga-15' })],
    ['custom habit', mk('I', { isCustomHabit: true }), mk('J')],
    ['different duration', mk('K'), mk('L', { durationDays: 30 })],
    ['timezone gap too wide', mk('M'), mk('N', { timezone: 'America/Los_Angeles' })],
    ['previously unmatched', mk('O', { previouslyUnmatchedWith: ['P'] }), mk('P')]
  ];

  it.each(cases)('rejects: %s', (reason, a, b) => {
    const result = scorePair(a, b, NOW);
    expect(result.blocked).toBe(reason);
    expect(result.score).toBe(0);
  });

  it('rejects a past pairing named from either side', () => {
    expect(scorePair(mk('P'), mk('O', { previouslyUnmatchedWith: ['P'] }), NOW).blocked).toBe(
      'previously unmatched'
    );
  });

  it('allows a wide-but-workable gap', () => {
    // Colombo to London is 4h30 in August — inside the five-hour limit.
    const result = scorePair(mk('Q'), mk('R', { timezone: 'Europe/London' }), NOW);
    expect(result.blocked).toBeUndefined();
  });

  // v2 retired timezone proximity as a SCORED rule -- it survives only as the
  // MAX_TZ_GAP_MINUTES hard filter. An unknown zone therefore costs nothing.
  it('does not block on an unknown zone', () => {
    const unknown = scorePair(
      mk('U', { reflections: why('rich', 3) }),
      mk('V', { reflections: why('rich', 1), timezone: null }),
      NOW
    );
    expect(unknown.blocked).toBeUndefined();
  });
});

describe('soft rules', () => {
  it('penalises a style clash and rewards a fit', () => {
    const clash = scorePair(
      mk('W', { style: 'competitive', reflections: why('rich', 3) }),
      mk('X', { style: 'encouraging', reflections: why('rich', 1) }),
      NOW
    );
    const harmony = scorePair(
      mk('Y', { style: 'team', reflections: why('rich', 3) }),
      mk('Z', { style: 'encouraging', reflections: why('rich', 1) }),
      NOW
    );
    expect(clash.score).toBeLessThan(harmony.score);
    expect(clash.reasons).toContain('style clash (competitive vs encouraging)');
    expect(harmony.reasons).toContain('styles fit well (team / encouraging)');
  });

  // Timezone is a hard filter in v2, not a soft rule: inside the tolerance
  // every pair scores the same, outside it they are blocked outright.
  it('treats timezones as a filter, not a gradient', () => {
    const inZone = (timezone: string, id: string) =>
      scorePair(
        mk(`${id}1`, { reflections: why('rich', 3) }),
        mk(`${id}2`, { reflections: why('rich', 1), timezone }),
        NOW
      );
    expect(inZone('Asia/Colombo', 'a').score).toBe(inZone('Asia/Kathmandu', 'b').score);
    expect(inZone('Europe/London', 'c').blocked).toBeUndefined();
    expect(inZone('America/New_York', 'd2').blocked).toBe('timezone gap too wide');
  });

  // profiles.city is derived as split_part(timezone, '/', -1), so every Sri
  // Lankan user is literally 'Colombo' -- it awarded its points to the entire
  // local pool at once. v2 replaces it with corridor-tag proximity, which
  // only applies when the pair is actually meeting in person.
  it('scores location by shared corridor tags, for in-person pairs only', () => {
    const together = (aTags: string[], bTags: string[]) =>
      scorePair(
        mk('f1', { mode: 'together', locationTags: aTags, reflections: why('rich', 3) }),
        mk('f2', { mode: 'together', locationTags: bTags, reflections: why('rich', 1) }),
        NOW
      );
    // Nugegoda {high_level, kotte_belt} vs Rajagiriya {kotte_belt, inner_east}
    const partial = together(['high_level', 'kotte_belt'], ['kotte_belt', 'inner_east']);
    const exact = together(['high_level', 'kotte_belt'], ['high_level', 'kotte_belt']);
    expect(exact.score).toBeGreaterThan(partial.score);
    expect(exact.reasons).toContain('same area');
    expect(partial.reasons).toContain('nearby areas');

    // No shared corridor is a hard block when meeting in person.
    expect(together(['galle_road'], ['kandy_road']).blocked).toBe('no shared location corridor');

    // ...and irrelevant when each does their own session.
    const separate = scorePair(
      mk('g1', { mode: 'separate', locationTags: ['galle_road'] }),
      mk('g2', { mode: 'separate', locationTags: ['kandy_road'] }),
      NOW
    );
    expect(separate.blocked).toBeUndefined();
  });

  it('boosts people who have been waiting', () => {
    const fresh = scorePair(
      mk('f1', { reflections: why('rich', 3) }),
      mk('f2', { reflections: why('rich', 1) }),
      NOW
    );
    const waiting = scorePair(
      mk('g1', { reflections: why('rich', 3), joinedPoolAt: NOW - 120 * HOURS }),
      mk('g2', { reflections: why('rich', 1), joinedPoolAt: NOW - 120 * HOURS }),
      NOW
    );
    expect(waiting.score).toBeGreaterThan(fresh.score);
    expect(waiting.reasons).toContain('waiting a while — prioritised');
    expect(fresh.reasons).not.toContain('waiting a while — prioritised');
  });

  it('starts the fairness boost at 48 hours, not before', () => {
    const pair = (waited: number) =>
      scorePair(
        mk('h1', { reflections: why('rich', 3), joinedPoolAt: NOW - waited }),
        mk('h2', { reflections: why('rich', 1), joinedPoolAt: NOW - waited }),
        NOW
      );
    expect(pair(47 * HOURS).reasons).not.toContain('waiting a while — prioritised');
    expect(pair(48 * HOURS).reasons).toContain('waiting a while — prioritised');
  });
});

describe('matchPool', () => {
  const pool: Candidate[] = [
    mk('dinesh', { reflections: why('rich'), style: 'team' }),
    mk('kavindu', { reflections: why('rich', 1), style: 'encouraging' }),
    mk('amara', { reflections: why('rich', 3), style: 'momentum' }),
    mk('nadia', { reflections: why('rich', 1), style: 'momentum' }),
    mk('sahan', { reflections: why('thin'), style: 'competitive' }),
    mk('ruwan', { reflections: why('thin'), style: 'competitive' }),
    mk('priya', { challengeTemplateId: 'yoga-15', reflections: why('rich', 3) })
  ];

  const result = matchPool(pool, DEFAULT_MIN_SCORE, NOW);

  it('pairs each person at most once', () => {
    const paired = result.pairs.flatMap((p) => [p.a, p.b]);
    expect(new Set(paired).size).toBe(paired.length);
  });

  it('pairs each anchor with someone who needs one', () => {
    const partners = result.pairs.map((p) => [p.a, p.b].sort().join(' + ')).sort();
    expect(partners).toEqual(['amara + nadia', 'dinesh + kavindu']);
  });

  it('leaves the two low-signal people and the odd habit out of the pairs', () => {
    expect(result.unmatched).toContain('sahan');
    expect(result.unmatched).toContain('ruwan');
    // Nobody else is doing yoga, so there is no valid pair for priya at all.
    expect(result.unmatched).toContain('priya');
  });

  it('accounts for everyone exactly once, matched or not', () => {
    const seen = [...result.pairs.flatMap((p) => [p.a, p.b]), ...result.unmatched].sort();
    expect(seen).toEqual(pool.map((c) => c.userId).sort());
  });

  it('makes no pairing below the threshold', () => {
    for (const pair of result.pairs) expect(pair.score).toBeGreaterThanOrEqual(DEFAULT_MIN_SCORE);
  });

  it('is deterministic whatever order the pool came back in', () => {
    const reversed = matchPool([...pool].reverse(), DEFAULT_MIN_SCORE, NOW);
    const key = (r: typeof result) =>
      r.pairs.map((p) => [p.a, p.b].sort().join('+')).sort();
    expect(key(reversed)).toEqual(key(result));
    expect(reversed.unmatched.sort()).toEqual(result.unmatched.sort());
  });

  it('keeps someone waiting rather than making a bad pairing', () => {
    const weakOnly = matchPool(
      [mk('i1', { reflections: why('thin') }), mk('i2', { reflections: why('thin') })],
      DEFAULT_MIN_SCORE,
      NOW
    );
    expect(weakOnly.pairs).toEqual([]);
    expect(weakOnly.unmatched).toEqual(['i1', 'i2']);
  });

  it('is pickier as the threshold rises', () => {
    const strict = matchPool(pool, 90, NOW);
    expect(strict.pairs.length).toBeLessThanOrEqual(result.pairs.length);
    expect(strict.unmatched.length).toBeGreaterThanOrEqual(result.unmatched.length);
  });

  it('handles an empty pool', () => {
    expect(matchPool([], DEFAULT_MIN_SCORE, NOW)).toEqual({ pairs: [], unmatched: [] });
  });
});

// ---------------------------------------------------------------------------
// v2 rules (Choner_Matching_Algorithm_v2_Scoring.md)
// ---------------------------------------------------------------------------

describe('v2 hard filters', () => {
  const cases: Array<[string, Partial<Candidate>, Partial<Candidate>]> = [
    ['different exercise', { specificExercise: 'pushups' }, { specificExercise: 'squats' }],
    ['different mode', { mode: 'together' }, { mode: 'separate' }],
    ['different cadence', { daysPerWeek: 7 }, { daysPerWeek: 3 }],
    ['gender preference', { sameGenderOnly: true, gender: 'female' }, { gender: 'male' }],
    ['minor with adult', { isMinor: true }, { isMinor: false }],
    ['no gym access', { gymAccess: 'not_yet' }, { gymAccess: 'have_membership' }],
    ['no bike access', { bikeAccess: 'none_yet' }, { bikeAccess: 'own_bike' }]
  ];

  it.each(cases)('rejects: %s', (reason, aOpts, bOpts) => {
    const result = scorePair(mk('p', aOpts), mk('q', bOpts), NOW);
    expect(result.blocked).toBe(reason);
  });

  // Asymmetric on purpose: one person with a court can bring the other, so it
  // only blocks when NEITHER has access.
  it('blocks court access only when neither side has any', () => {
    const neither = scorePair(
      mk('r', { courtAccess: 'need_partner_to_arrange' }),
      mk('s', { courtAccess: 'need_partner_to_arrange' }),
      NOW
    );
    const one = scorePair(
      mk('t', { courtAccess: 'need_partner_to_arrange' }),
      mk('u', { courtAccess: 'have_regular_court' }),
      NOW
    );
    expect(neither.blocked).toBe('no court access');
    expect(one.blocked).toBeUndefined();
  });

  it('never blocks a same-gender pair on a gender preference', () => {
    const result = scorePair(
      mk('v', { sameGenderOnly: true, gender: 'female' }),
      mk('w', { gender: 'female' }),
      NOW
    );
    expect(result.blocked).toBeUndefined();
  });
});

describe('v2 soft rules', () => {
  // The spec's central bet: mild asymmetry beats similarity, because two
  // people both at 95% fail on the same day and two both at 40% quietly stop.
  it('prefers one anchoring and one stretching over two of a kind', () => {
    const ratio = (capability: number, commitment: number) => ({
      capabilityValue: capability,
      commitmentValue: commitment
    });
    const ideal = scorePair(
      mk('x1', { ...ratio(40, 25), reflections: why('rich', 3) }), // 0.63 healthy
      mk('x2', { ...ratio(22, 20), reflections: why('rich', 1) }), // 0.91 stretching
      NOW
    );
    const bothStretching = scorePair(
      mk('y1', { ...ratio(22, 21), reflections: why('rich', 3) }),
      mk('y2', { ...ratio(22, 21), reflections: why('rich', 1) }),
      NOW
    );
    expect(ideal.score).toBeGreaterThan(bothStretching.score);
    expect(ideal.reasons).toContain('one anchoring, one stretching — ideal');
  });

  // A null capability is a beginner, never missing data — no ratio is computed
  // from it, and two total beginners on an unfamiliar activity score lowest.
  it('treats a null capability as a beginner rather than computing a ratio', () => {
    const twoBeginners = scorePair(
      mk('z1', { capabilityValue: null, commitmentValue: 2, reflections: why('rich', 3) }),
      mk('z2', { capabilityValue: null, commitmentValue: 2, reflections: why('rich', 1) }),
      NOW
    );
    const mixed = scorePair(
      mk('z3', { capabilityValue: null, commitmentValue: 2, reflections: why('rich', 3) }),
      mk('z4', { capabilityValue: 10, commitmentValue: 7, reflections: why('rich', 1) }),
      NOW
    );
    expect(twoBeginners.reasons).toContain('two beginners — higher risk');
    expect(mixed.reasons).toContain('beginner paired with someone experienced');
    expect(mixed.score).toBeGreaterThan(twoBeginners.score);
  });

  it('scores one experience level apart above an identical pair', () => {
    const adjacent = scorePair(
      mk('e1', { experience: 'some', reflections: why('rich', 3) }),
      mk('e2', { experience: 'experienced', reflections: why('rich', 1) }),
      NOW
    );
    const identical = scorePair(
      mk('e3', { experience: 'some', reflections: why('rich', 3) }),
      mk('e4', { experience: 'some', reflections: why('rich', 1) }),
      NOW
    );
    expect(adjacent.score).toBeGreaterThan(identical.score);
  });

  it('weights badminton skill but ignores it for other activities', () => {
    const badminton = (aSkill: SkillLevel, bSkill: SkillLevel) =>
      scorePair(
        mk('b1', { activityKey: 'badminton', skillLevel: aSkill }),
        mk('b2', { activityKey: 'badminton', skillLevel: bSkill }),
        NOW
      );
    expect(badminton('beginner', 'beginner').score).toBeGreaterThan(
      badminton('beginner', 'advanced').score
    );
    // Not applicable to running, so it can't drag the score down there.
    const running = scorePair(
      mk('b3', { activityKey: 'running', skillLevel: 'beginner' }),
      mk('b4', { activityKey: 'running', skillLevel: 'advanced' }),
      NOW
    );
    expect(running.reasons).not.toContain('large skill gap');
  });

  it('penalises a pace mismatch only when actually running together', () => {
    const together = scorePair(
      mk('c1', { mode: 'together', activityKey: 'running', pace: 'slow', locationTags: ['galle_road'] }),
      mk('c2', { mode: 'together', activityKey: 'running', pace: 'fast', locationTags: ['galle_road'] }),
      NOW
    );
    const separate = scorePair(
      mk('c3', { mode: 'separate', activityKey: 'running', pace: 'slow' }),
      mk('c4', { mode: 'separate', activityKey: 'running', pace: 'fast' }),
      NOW
    );
    expect(together.reasons).toContain('pace mismatch — hard to run together');
    expect(separate.reasons).not.toContain('pace mismatch — hard to run together');
  });
});

describe('v2 normalization', () => {
  // The reason normalization exists: under v1's fixed-100 budget a `separate`
  // pairing could never score as well as a `together` one, because the rules
  // it had no way to earn still counted against it.
  it('makes separate and together pairings comparable', () => {
    const separate = scorePair(
      mk('n1', { mode: 'separate', reflections: why('rich', 3) }),
      mk('n2', { mode: 'separate', reflections: why('rich', 1) }),
      NOW
    );
    const together = scorePair(
      mk('n3', {
        mode: 'together',
        locationTags: ['high_level'],
        reflections: why('rich', 3)
      }),
      mk('n4', {
        mode: 'together',
        locationTags: ['high_level'],
        reflections: why('rich', 1)
      }),
      NOW
    );
    // Both are "as good as their applicable rules allow". Under v1's fixed-100
    // budget the separate pair forfeited the whole 25-point location weight it
    // had no way to earn; here the gap is far smaller than that.
    expect(Math.abs(separate.score - together.score)).toBeLessThan(
      WEIGHTS.locationProximity
    );
  });

  it('keeps every score inside 0-100', () => {
    const best = scorePair(
      mk('m1', {
        mode: 'together',
        locationTags: ['high_level'],
        ageBand: '25-34',
        experience: 'some',
        capabilityValue: 40,
        commitmentValue: 25,
        reflections: why('rich', 4),
        joinedPoolAt: NOW - 200 * HOURS
      }),
      mk('m2', {
        mode: 'together',
        locationTags: ['high_level'],
        ageBand: '25-34',
        experience: 'experienced',
        capabilityValue: 22,
        commitmentValue: 20,
        reflections: why('thin'),
        joinedPoolAt: NOW - 200 * HOURS
      }),
      NOW
    );
    expect(best.score).toBeGreaterThan(0);
    expect(best.score).toBeLessThanOrEqual(100);
  });
});

describe('matchPool with several requests per person', () => {
  // Someone running with one partner can separately look for a yoga partner.
  // Keying by user alone used to drop one of their two requests.
  const pool: Candidate[] = [
    mk('dinesh', { reflections: why('rich'), style: 'team' }),
    mk('dinesh', { challengeTemplateId: 'yoga-15', reflections: why('rich'), style: 'team' }),
    mk('kavindu', { reflections: why('rich', 1), style: 'encouraging' }),
    mk('amara', { challengeTemplateId: 'yoga-15', reflections: why('rich', 1), style: 'encouraging' })
  ];
  const result = matchPool(pool, DEFAULT_MIN_SCORE, NOW);

  it('pairs each of their requests, one partner per habit', () => {
    const pairs = result.pairs.map((p) => `${p.challengeTemplateId}:${[p.a, p.b].sort().join('+')}`).sort();
    expect(pairs).toEqual(['run-1-mile:dinesh+kavindu', 'yoga-15:amara+dinesh']);
  });

  it('records which habit each pair is for', () => {
    for (const p of result.pairs) expect(p.challengeTemplateId).toBeTruthy();
  });
});

describe('"Either works" mode (D3)', () => {
  const pair = (a: Candidate['mode'], b: Candidate['mode']) =>
    scorePair(mk('x', { mode: a }), mk('y', { mode: b }), NOW).blocked ?? null;

  it('is compatible with Together and with Separately', () => {
    expect(pair('either', 'separate')).toBeNull();
    expect(pair('either', 'either')).toBeNull();
  });

  it('still refuses Together with Separately', () => {
    expect(pair('together', 'separate')).toBe('different mode');
  });

  it('holds Either+Together to the in-person rules, but not Either+Either', () => {
    // No location corridor at all: blocks only when they will actually meet.
    expect(pair('either', 'together')).toBe('no shared location corridor');
    expect(pair('either', 'either')).toBeNull();
  });
});
