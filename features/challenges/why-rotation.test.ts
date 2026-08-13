import {
  CUSTOM_CHOICE_KEY,
  REFLECTION_QUESTIONS,
  ReflectionAnswer,
  ReflectionQuestionKey,
  isAnswered,
  reminderFor
} from './reflections';
import {
  challengeDayIndex,
  dailyReminder,
  isAtRisk,
  pickReflection,
  scheduledQuestionKey
} from './why-rotation';

function answer(
  question_key: ReflectionQuestionKey,
  choice_key: string | null,
  custom_text: string | null = null
): ReflectionAnswer {
  return { question_key, choice_key, custom_text };
}

const FULL_SET: ReflectionAnswer[] = [
  answer('purpose', 'healthier_routine'),
  answer('matters', 'tried_before'),
  answer('gain', 'more_energy'),
  answer('lose', 'lost_progress')
];

describe('reminderFor', () => {
  it('resolves a quick-select choice to its reminder sentence', () => {
    expect(reminderFor(answer('gain', 'more_energy'))).toBe(
      'Stick with it and you get more energy.'
    );
  });

  it("prefers the user's own words over the canned copy", () => {
    expect(reminderFor(answer('purpose', 'healthier_routine', 'For my daughter'))).toBe(
      'Your reason: For my daughter'
    );
  });

  it('treats "Something else" with no text as unanswered', () => {
    expect(reminderFor(answer('purpose', CUSTOM_CHOICE_KEY))).toBeNull();
    expect(reminderFor(answer('purpose', CUSTOM_CHOICE_KEY, '   '))).toBeNull();
    expect(isAnswered(answer('purpose', CUSTOM_CHOICE_KEY))).toBe(false);
  });

  it('has reminder copy for every option of every question', () => {
    for (const q of REFLECTION_QUESTIONS) {
      for (const o of q.options) {
        expect(reminderFor(answer(q.key, o.key))).toBe(o.reminder);
      }
    }
  });
});

describe('challengeDayIndex', () => {
  it('counts calendar days from the start, 1-based', () => {
    const started = '2026-08-10T09:00:00.000Z';
    expect(challengeDayIndex(started, new Date(2026, 7, 10, 12))).toBe(1);
    expect(challengeDayIndex(started, new Date(2026, 7, 12, 6))).toBe(3);
  });

  it('rolls over at local midnight, not 24 elapsed hours', () => {
    const lateStart = new Date(2026, 7, 10, 23, 50).toISOString();
    expect(challengeDayIndex(lateStart, new Date(2026, 7, 11, 0, 5))).toBe(2);
  });

  it('never returns less than 1', () => {
    expect(challengeDayIndex(null)).toBe(1);
    expect(challengeDayIndex('not a date')).toBe(1);
    expect(challengeDayIndex(new Date(2026, 7, 20).toISOString(), new Date(2026, 7, 10))).toBe(1);
  });
});

describe('isAtRisk', () => {
  it('is never true once the day is logged', () => {
    expect(isAtRisk({ completedToday: true, now: new Date(2026, 7, 10, 23) })).toBe(false);
  });

  it('turns on three hours before the deadline', () => {
    expect(isAtRisk({ completedToday: false, now: new Date(2026, 7, 10, 16, 59) })).toBe(false);
    expect(isAtRisk({ completedToday: false, now: new Date(2026, 7, 10, 17) })).toBe(true);
  });

  it('follows a custom deadline', () => {
    const now = new Date(2026, 7, 10, 12);
    expect(isAtRisk({ completedToday: false, deadlineHour: 15, now })).toBe(true);
    expect(isAtRisk({ completedToday: false, deadlineHour: 22, now })).toBe(false);
  });
});

describe('scheduledQuestionKey', () => {
  it('rotates purpose -> matters -> gain across the week', () => {
    const keys = [1, 2, 3, 4, 6, 7].map((dayIndex) =>
      scheduledQuestionKey({ dayIndex, atRisk: false })
    );
    expect(keys).toEqual(['purpose', 'matters', 'gain', 'purpose', 'gain', 'purpose']);
  });

  it('keeps loss framing out of the ordinary rotation', () => {
    for (const dayIndex of [1, 2, 3, 4, 6, 7, 8, 9]) {
      expect(scheduledQuestionKey({ dayIndex, atRisk: false })).not.toBe('lose');
    }
  });

  it('surfaces loss on its slow cadence', () => {
    expect(scheduledQuestionKey({ dayIndex: 5, atRisk: false })).toBe('lose');
    expect(scheduledQuestionKey({ dayIndex: 10, atRisk: false })).toBe('lose');
  });

  it('surfaces loss whenever the day is at risk, whatever the rotation says', () => {
    for (const dayIndex of [1, 2, 3, 4, 5, 6, 7]) {
      expect(scheduledQuestionKey({ dayIndex, atRisk: true })).toBe('lose');
    }
  });
});

describe('pickReflection', () => {
  it('returns the scheduled answer when the whole set is filled in', () => {
    expect(pickReflection({ dayIndex: 2, atRisk: false, answers: FULL_SET })?.question_key).toBe(
      'matters'
    );
    expect(pickReflection({ dayIndex: 2, atRisk: true, answers: FULL_SET })?.question_key).toBe(
      'lose'
    );
  });

  it('falls forward through the rotation when the scheduled question was skipped', () => {
    const partial = [answer('gain', 'confidence')];
    expect(pickReflection({ dayIndex: 1, atRisk: false, answers: partial })?.question_key).toBe(
      'gain'
    );
  });

  it('still differs day to day when only two of the three are answered', () => {
    const partial = [answer('purpose', 'feel_better'), answer('gain', 'better_health')];
    const day1 = pickReflection({ dayIndex: 1, atRisk: false, answers: partial });
    const day2 = pickReflection({ dayIndex: 2, atRisk: false, answers: partial });
    expect(day1?.question_key).toBe('purpose');
    expect(day2?.question_key).toBe('gain');
  });

  it('uses the loss answer rather than nothing when it is all they filled in', () => {
    const only = [answer('lose', 'lost_proof')];
    expect(pickReflection({ dayIndex: 1, atRisk: false, answers: only })?.question_key).toBe('lose');
  });

  it('returns null when the reflection was skipped entirely', () => {
    expect(pickReflection({ dayIndex: 1, atRisk: false, answers: [] })).toBeNull();
    expect(dailyReminder({ dayIndex: 1, atRisk: false, answers: [] })).toBeNull();
  });

  it('is stable for a given day', () => {
    const a = dailyReminder({ dayIndex: 3, atRisk: false, answers: FULL_SET });
    const b = dailyReminder({ dayIndex: 3, atRisk: false, answers: FULL_SET });
    expect(a).toBe(b);
    expect(a).toBe('Stick with it and you get more energy.');
  });
});
