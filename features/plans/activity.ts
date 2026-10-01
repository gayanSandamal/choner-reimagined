import { COPY, DISTANCES } from './copy';

// The plan flow was written for running, and said so everywhere: "Plan your
// first run", "Run together", "How far would you like to run?". Every one of
// the six activities plans sessions now, so the words come from the activity.
//
// Running keeps the handover's exact strings (copy.ts), which copy.test.ts
// holds against the handover document. Everything else is built here.

type Words = {
  // "your first run", "your first yoga session"
  noun: string;
  // "Run together", "Practise together"
  verb: string;
  // "How far would you like to run?"
  howMuch: string;
};

const WORDS: Record<string, Words> = {
  running: { noun: 'run', verb: 'Run', howMuch: COPY.howFar },
  jogging: { noun: 'jog', verb: 'Jog', howMuch: 'How far would you like to jog?' },
  walking: { noun: 'walk', verb: 'Walk', howMuch: 'How far would you like to walk?' },
  cycling: { noun: 'ride', verb: 'Ride', howMuch: 'How far would you like to ride?' },
  yoga: { noun: 'yoga session', verb: 'Practise', howMuch: 'How long would you like to practise?' },
  home_workouts: { noun: 'workout', verb: 'Work out', howMuch: 'How long would you like to work out?' }
};

// An activity this build has never heard of still plans a "session".
const FALLBACK: Words = { noun: 'session', verb: 'Do it', howMuch: 'How much would you like to do?' };

const words = (activity: string | null | undefined): Words => WORDS[activity ?? ''] ?? FALLBACK;

// Yoga and Workouts are measured in minutes; the other four in distance.
export const DURATIONS = ['10 min', '15 min', '20 min', '30 min', '45 min', '60 min or more', 'Not sure yet'] as const;

export function measuredInMinutes(activity: string | null | undefined): boolean {
  return activity === 'yoga' || activity === 'home_workouts';
}

// The answers to "how much", in the unit the activity is measured in. The
// server accepts exactly these (plan_distance_ok, 202610021000).
export function amountOptions(activity: string | null | undefined): readonly string[] {
  return measuredInMinutes(activity) ? DURATIONS : DISTANCES;
}

export const activityNoun = (activity: string | null | undefined) => words(activity).noun;
export const howMuchHeading = (activity: string | null | undefined) => words(activity).howMuch;

// "Distance" for the four, "Time" for the two.
export const amountLabel = (activity: string | null | undefined) =>
  measuredInMinutes(activity) ? 'Time' : 'Distance';

export function planCopy(activity: string | null | undefined) {
  const w = words(activity);
  return {
    gateButton: `Plan your first ${w.noun}`,
    stepsInSub: `Let's plan your first ${w.noun} together.`,
    modeHeading: `How do you want to do your first ${w.noun}?`,
    modeTogether: `${w.verb} together`,
    modeTogetherSub: `Meet up and ${w.verb.toLowerCase()} together`,
    modeSeparate: `${w.verb} separately, together`,
    modeSeparateSub: `Do your ${w.noun} without meeting up, but stay accountable to each other.`,
    firstTitle: `Your first ${w.noun}`,
    yourCard: `Your ${w.noun}`,
    theirCard: (name: string) => `${name}'s ${w.noun}`
  };
}
