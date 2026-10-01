import {
  canNudge,
  canRunLate,
  cancelRequest,
  cancelWarning,
  isSameLocalDay,
  isSessionToday,
  memberStatus,
  moveRequest,
  sessionRefusal
} from './session';
import type { PairPlan, PlanMember } from './types';

const member = (over: Partial<PlanMember> = {}): PlanMember => ({
  distance_answer: '5 km',
  mode_answer: null,
  confirmed_at: '2026-10-01T00:00:00Z',
  on_my_way_at: null,
  here_at: null,
  finished_at: null,
  checkin: null,
  checkin_at: null,
  miss_reason: null,
  ...over
});

const NOW = new Date(2026, 9, 4, 9, 0, 0);
const laterToday = new Date(2026, 9, 4, 18, 30, 0).toISOString();
const tomorrow = new Date(2026, 9, 5, 7, 0, 0).toISOString();

const plan = (over: Partial<PairPlan> = {}): PairPlan =>
  ({
    id: 'p1',
    kind: 'meetup',
    status: 'confirmed',
    activity_key: 'running',
    mode: 'together',
    distance: '5 km',
    place_name: 'Park',
    place_text: null,
    meeting_location_status: 'agreed',
    founder_help_required: false,
    starts_at: laterToday,
    i_open: true,
    me: member(),
    them: { ...member(), first_name: 'Gayan', avatar_url: null },
    messages: [],
    open_proposals: [],
    ...over
  }) as PairPlan;

describe('the day itself', () => {
  it('is the same calendar day on the device', () => {
    expect(isSameLocalDay(laterToday, NOW)).toBe(true);
    expect(isSameLocalDay(tomorrow, NOW)).toBe(false);
    expect(isSameLocalDay(null, NOW)).toBe(false);
    expect(isSameLocalDay('not a date', NOW)).toBe(false);
  });

  it('uses my own time when the two of us have different ones', () => {
    const p = plan({ mode: 'separate', starts_at: laterToday, me: member({ planned_at: tomorrow }) });
    expect(isSessionToday(p, NOW)).toBe(false);
  });
});

describe('cancelRequest', () => {
  const ask = (expires: string, mine = false) => ({
    id: 'c1',
    field: 'cancel' as const,
    value: { expires_at: expires },
    mine,
    round: 1
  });

  it('is live until the end of the asker\'s day', () => {
    const p = plan({ open_proposals: [ask(new Date(2026, 9, 5, 0, 0, 0).toISOString())] });
    expect(cancelRequest(p, NOW)?.id).toBe('c1');
  });

  it('lapses after that: the plan stands', () => {
    const p = plan({ open_proposals: [ask(new Date(2026, 9, 4, 0, 0, 0).toISOString())] });
    expect(cancelRequest(p, NOW)).toBeNull();
  });

  it('ignores other proposals, and a request with no clock', () => {
    const p = plan({
      open_proposals: [
        { id: 'r1', field: 'reschedule', value: { starts_at: tomorrow }, mine: true, round: 1 },
        { id: 'c2', field: 'cancel', value: {}, mine: false, round: 1 }
      ]
    });
    expect(cancelRequest(p, NOW)).toBeNull();
    expect(moveRequest(p)?.id).toBe('r1');
  });
});

describe('memberStatus', () => {
  it('reads as the latest thing they did', () => {
    expect(memberStatus(member(), 'together', 'them')).toBe('In');
    expect(memberStatus(member({ on_my_way_at: 'x' }), 'together', 'them')).toBe('On the way');
    expect(memberStatus(member({ on_my_way_at: 'x', late_minutes: 10 }), 'together', 'them')).toBe(
      'Running about 10 minutes late'
    );
    expect(memberStatus(member({ late_minutes: 10, here_at: 'x' }), 'together', 'them')).toBe('Already here');
    expect(memberStatus(member({ here_at: 'x', finished_at: 'y' }), 'together', 'me')).toBe('Done');
  });

  it('covers the separate check-ins', () => {
    expect(memberStatus(member({ checkin: 'later' }), 'separate', 'me')).toBe('Doing it later today');
    expect(memberStatus(member({ checkin: 'cant' }), 'separate', 'them')).toBe("Can't make it today");
    expect(memberStatus(member({ checkin: 'done' }), 'separate', 'them')).toBe('Done');
  });

  it('never says "late" for a session done separately', () => {
    expect(memberStatus(member({ late_minutes: 15 }), 'separate', 'them')).toBe('In');
  });
});

describe('nudge and running late', () => {
  it('are for the day itself', () => {
    expect(canNudge(plan(), NOW)).toBe(true);
    expect(canRunLate(plan(), NOW)).toBe(true);
    expect(canNudge(plan({ starts_at: tomorrow }), NOW)).toBe(false);
    expect(canRunLate(plan({ starts_at: tomorrow }), NOW)).toBe(false);
  });

  it('nudge is once, and not when they are already there or done', () => {
    expect(canNudge(plan({ me: member({ nudged_at: 'x' }) }), NOW)).toBe(false);
    expect(canNudge(plan({ them: { ...member({ here_at: 'x' }), first_name: 'Gayan', avatar_url: null } }), NOW)).toBe(false);
    expect(
      canNudge(plan({ mode: 'separate', them: { ...member({ checkin: 'done' }), first_name: 'Gayan', avatar_url: null } }), NOW)
    ).toBe(false);
  });

  it('running late is a meetup thing, and stops once you arrive', () => {
    expect(canRunLate(plan({ mode: 'separate' }), NOW)).toBe(false);
    expect(canRunLate(plan({ me: member({ here_at: 'x' }) }), NOW)).toBe(false);
  });

  it('neither is offered before both have agreed the plan', () => {
    expect(canNudge(plan({ status: 'planning' }), NOW)).toBe(false);
    expect(canRunLate(plan({ status: 'planning' }), NOW)).toBe(false);
  });
});

describe('copy', () => {
  it('warns before a cancel: no undo, needs agreement, and the streak is safe', () => {
    const w = cancelWarning(plan());
    expect(w.title).toBe('Cancel this run?');
    expect(w.message).toContain("can't be undone");
    expect(w.message).toContain('Gayan has to agree');
    expect(w.message).toContain('the plan stands');
    expect(w.message).toContain('does not touch your streak');
  });

  it('has no long dashes and names the partner in refusals', () => {
    const all = ['not_today', 'already_nudged', 'already_done', 'already_here', 'not_meetup', 'they_asked', 'expired', 'no_plan', 'x']
      .map((r) => sessionRefusal(r, 'Gayan'))
      .concat(cancelWarning(plan()).message);
    for (const line of all) expect(line).not.toMatch(/[—–]/);
    expect(sessionRefusal('already_nudged', 'Gayan')).toContain('Gayan');
  });
});
