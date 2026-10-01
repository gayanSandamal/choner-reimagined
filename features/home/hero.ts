import { activityNoun } from '@/features/plans/activity';
import { formatDayTime } from '@/features/plans/format';
import type { PairPlan } from '@/features/plans/types';

// Home is a STATE, not a dashboard. It shows the current commitment and the
// single next action, and it starts nothing and ends nothing of its own:
//
//   - a partner action is a tab switch to Find
//   - a challenge action is a tab switch to Challenges
//   - the only thing Home opens itself is a sheet ABOUT the commitment it is
//     already showing: the plan, or the session
//
// Every button names what the person GETS ("See your match"), never where it
// goes ("Go to Find").
//
// The word "commitment" is earned. It is not used before two people have
// agreed a plan (docs/LANGUAGE_FLOW.md), so the eyebrow walks the same five
// moments Challenges does and the two tabs read as one step.

export type HomeAction =
  // Tab switches.
  | { label: string; to: 'find' | 'challenges' }
  // Sheets about the commitment already on screen.
  | { label: string; to: 'plan' }
  | { label: string; to: 'start_session' };

export type HomeHero = {
  eyebrow: string | null;
  title: string;
  line: string | null;
  action: HomeAction | null;
  // The pulsing "Searching" row. It opens Find and is the only control then.
  searching: boolean;
};

export type HomeHeroInput = {
  // The activity's name ("Running"), or null with no challenge.
  activity: string | null;
  activityKey: string | null;
  // The challenge's search state: solo | finding | invited | matched | partnered.
  partnerState: string;
  // From the partnership, which outlives a challenge.
  partnerName: string | null;
  plan: PairPlan | null;
  // Whether this pair has ever agreed a plan: any session on the streak.
  agreedBefore: boolean;
  repairOwed: boolean;
  locale?: string;
};

export function homeHero(i: HomeHeroInput): HomeHero {
  const noun = activityNoun(i.activityKey);
  const partnered = Boolean(i.partnerName);

  // 1. Nothing picked. Challenges owns the picker, so this only changes tab.
  if (!i.activity) {
    return {
      eyebrow: null,
      title: 'Start something together',
      line: partnered
        ? `Pick what you and ${i.partnerName} will do next.`
        : 'Pick what you want to do with your partner.',
      action: { label: "Let's do this", to: 'challenges' },
      searching: false
    };
  }

  // 2. An activity, and no partner yet. Find owns every one of these.
  if (!partnered) {
    if (i.partnerState === 'matched') {
      return {
        eyebrow: 'A match is waiting',
        title: i.activity,
        line: 'Someone wants to do this with you.',
        action: { label: 'See your match', to: 'find' },
        searching: false
      };
    }
    if (i.partnerState === 'finding') {
      return {
        eyebrow: "Let's make it happen",
        title: i.activity,
        line: "We're looking for your partner. We'll notify you the moment you're matched.",
        action: null,
        searching: true
      };
    }
    if (i.partnerState === 'invited') {
      return {
        eyebrow: "Let's make it happen",
        title: i.activity,
        line: 'Waiting for your partner to join.',
        action: { label: 'See your invite', to: 'find' },
        searching: false
      };
    }
    return {
      eyebrow: "Let's make it happen",
      title: i.activity,
      line: 'Find someone who wants to do it too.',
      action: { label: 'Find a partner', to: 'find' },
      searching: false
    };
  }

  // 3. Partnered. A missed session to make up comes before anything else:
  // while it is open it is the next thing to decide.
  if (i.repairOwed) {
    return {
      eyebrow: 'One session owed',
      title: i.activity,
      line: `You and ${i.partnerName} each owe one. Nothing resets: pick when to make it up.`,
      action: { label: 'Make it up', to: 'challenges' },
      searching: false
    };
  }

  const plan = i.plan;
  if (plan && (plan.status === 'confirmed' || plan.status === 'verified') && plan.starts_at) {
    const when = formatDayTime(plan.starts_at);
    return {
      eyebrow: 'Your next commitment',
      title: `${when.day} · ${when.time}`,
      line:
        plan.mode === 'together'
          ? [plan.place_name, `with ${i.partnerName}`].filter(Boolean).join(' · ')
          : `Separately, together · with ${i.partnerName}`,
      action: { label: 'View session', to: 'plan' },
      searching: false
    };
  }

  if (plan && plan.status === 'completed') {
    return {
      eyebrow: 'You both showed up',
      title: i.activity,
      line: 'One session is planned at a time. Plan the next one.',
      action: { label: `Plan your next ${noun}`, to: 'start_session' },
      searching: false
    };
  }

  if (plan && plan.status === 'planning') {
    return i.agreedBefore
      ? {
          eyebrow: 'Your commitment',
          title: i.activity,
          line: `You and ${i.partnerName} are planning the next one.`,
          action: { label: 'Keep planning', to: 'plan' },
          searching: false
        }
      : {
          eyebrow: 'You found your match',
          title: i.activity,
          line: `Now let's plan your first ${noun}.`,
          action: { label: `Plan your first ${noun}`, to: 'plan' },
          searching: false
        };
  }

  // Partnered with nothing on the table.
  return i.agreedBefore
    ? {
        eyebrow: 'Your commitment',
        title: i.activity,
        line: 'Nothing planned yet. Sessions are planned one at a time.',
        action: { label: `Plan your next ${noun}`, to: 'start_session' },
        searching: false
      }
    : {
        eyebrow: 'You found your match',
        title: i.activity,
        line: `Now let's plan your first ${noun}.`,
        action: { label: `Plan your first ${noun}`, to: 'start_session' },
        searching: false
      };
}

// ---------------------------------------------------------------------------
// The heart. Sessions with THIS partner, not the streak: a different number
// measuring a different thing. It grows at five points.
export const HEART_STAGES = [1, 5, 10, 25, 50] as const;

// 0 before the first session together, then 1..5 as each stage is reached.
export function heartStage(sessionsTogether: number): number {
  return HEART_STAGES.filter((m) => sessionsTogether >= m).length;
}

export function heartCopy(i: {
  partnerName: string | null;
  partnerState: string;
  sessionsTogether: number;
}): { title: string; count: string | null; line: string | null } {
  if (i.partnerName) {
    const k = i.sessionsTogether;
    return k > 0
      ? {
          title: `You + ${i.partnerName}`,
          count: `${k} ${k === 1 ? 'session' : 'sessions'} together`,
          line: `You both showed up ${k} ${k === 1 ? 'time' : 'times'}.`
        }
      : { title: `You + ${i.partnerName}`, count: null, line: 'Your first one together is next.' };
  }
  return {
    title: 'You + ?',
    count: null,
    line:
      i.partnerState === 'finding'
        ? 'Looking for your partner.'
        : i.partnerState === 'invited'
        ? 'Waiting for your partner to join.'
        : null
  };
}

// ---------------------------------------------------------------------------
// Choner Pulse and Just Happened. Real numbers or nothing: a zero is not a
// moment, and a fabricated count is the kind of thing nobody remembers is
// fabricated.
export type HomePulse = {
  people: number;
  by_activity: { activity_key: string; title: string; people: number }[];
  pairs: number;
  new_pairs_today: number;
  sessions_today: number;
  sessions_planned: number;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// The lines Just Happened rotates through. Empty when nothing has happened,
// and then the card is not drawn at all.
export function pulseMoments(p: HomePulse | null | undefined): string[] {
  if (!p) return [];
  const out: string[] = [];
  if (p.sessions_today > 0) {
    out.push(`${p.sessions_today} ${plural(p.sessions_today, 'session was', 'sessions were')} completed today.`);
  }
  if (p.new_pairs_today > 0) {
    out.push(`${p.new_pairs_today} new ${plural(p.new_pairs_today, 'pair', 'pairs')} today.`);
  }
  if (p.pairs > 0) {
    out.push(`${p.pairs} ${plural(p.pairs, 'pair is', 'pairs are')} showing up together.`);
  }
  if (p.sessions_planned > 0) {
    out.push(`${p.sessions_planned} ${plural(p.sessions_planned, 'session is', 'sessions are')} planned.`);
  }
  return out;
}

// The line under the Pulse heading. Null when there is nobody to count.
export function pulseHeadline(p: HomePulse | null | undefined): string | null {
  if (!p || p.people <= 0) return null;
  return `${p.people} ${plural(p.people, 'person is', 'people are')} on Choner right now`;
}
