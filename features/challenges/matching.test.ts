import { CUSTOM_CHOICE_KEY, ReflectionAnswer } from './reflections';
import {
  Candidate,
  DEFAULT_MIN_SCORE,
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

  it('does not block on an unknown zone, but gives it no proximity points', () => {
    const known = scorePair(
      mk('S', { reflections: why('rich', 3) }),
      mk('T', { reflections: why('rich', 1) }),
      NOW
    );
    const unknown = scorePair(
      mk('U', { reflections: why('rich', 3) }),
      mk('V', { reflections: why('rich', 1), timezone: null }),
      NOW
    );
    expect(unknown.blocked).toBeUndefined();
    expect(unknown.reasons).toContain('timezone unknown — no overlap guarantee');
    expect(unknown.score).toBe(known.score - 25);
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

  it('scores closer time zones higher', () => {
    const inZone = (timezone: string, id: string) =>
      scorePair(
        mk(`${id}1`, { reflections: why('rich', 3) }),
        mk(`${id}2`, { reflections: why('rich', 1), timezone }),
        NOW
      );
    const same = inZone('Asia/Colombo', 'a');
    const near = inZone('Asia/Kathmandu', 'b'); // 15 minutes apart
    const far = inZone('Europe/London', 'c'); // 4h30 apart
    expect(same.score).toBeGreaterThan(near.score);
    expect(near.score).toBeGreaterThan(far.score);
    expect(same.reasons).toContain('same timezone');
  });

  it('rewards a shared city', () => {
    const together = scorePair(mk('d1'), mk('d2'), NOW);
    const apart = scorePair(mk('e1'), mk('e2', { city: 'Kandy' }), NOW);
    expect(together.score - apart.score).toBe(10);
    expect(together.reasons).toContain('both in Colombo');
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
