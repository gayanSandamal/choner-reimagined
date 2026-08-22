// The "Why" reflection (Challenge Setup Flow spec, Aug 2026).
//
// Four questions, asked once per user at Step 2 and editable for the life of
// the challenge. Each option carries BOTH the chip label and the sentence the
// daily reminder resurfaces, so the reminder copy can be tuned without
// touching the screens — and so a stored choice_key never has to be turned
// back into prose by string-munging the label.

// Sourced from the database types so this union and the check constraint on
// challenge_reflections.question_key cannot drift apart.
// Relative, not '@/': Deno has no path aliases, and the edge function reaches
// this file through matching.ts.
import type { ReflectionQuestionKey } from '../../types/database.ts';
export type { ReflectionQuestionKey };

// The escape hatch on every question. Selecting it reveals a text field; the
// typed answer is what gets resurfaced.
export const CUSTOM_CHOICE_KEY = 'something_else';

export interface ReflectionOption {
  key: string;
  label: string;
  // Full sentence used by the daily resurfacing on Home.
  reminder: string;
}

export interface ReflectionQuestion {
  key: ReflectionQuestionKey;
  prompt: string;
  // Lead-in for a reminder built from the user's own words.
  customReminderPrefix: string;
  options: ReflectionOption[];
}

export const REFLECTION_QUESTIONS: ReflectionQuestion[] = [
  {
    key: 'purpose',
    prompt: "What's your purpose for doing this?",
    customReminderPrefix: 'Your reason',
    options: [
      {
        key: 'healthier_routine',
        label: 'Build a healthier routine',
        reminder: "You're doing this to build a healthier routine."
      },
      {
        key: 'prove_consistency',
        label: 'Prove I can stick with something',
        reminder: "You're doing this to prove you can stick with something."
      },
      {
        key: 'feel_better',
        label: 'Feel better day to day',
        reminder: "You're doing this to feel better day to day."
      }
    ]
  },
  {
    key: 'matters',
    prompt: 'Why does this matter to you right now?',
    customReminderPrefix: 'Why it matters right now',
    options: [
      {
        key: 'upcoming_event',
        label: 'A specific goal or event coming up',
        reminder: "You've got something coming up — this is you getting ready for it."
      },
      {
        key: 'tried_before',
        label: "I've tried before and stopped",
        reminder: "You've tried before and stopped. This time you're still here."
      },
      {
        key: 'someone_inspired',
        label: 'Someone I care about inspired this',
        reminder: 'Someone you care about is the reason you started this.'
      }
    ]
  },
  {
    key: 'gain',
    prompt: 'What will you gain if you stick with it?',
    customReminderPrefix: 'What you gain',
    options: [
      {
        key: 'more_energy',
        label: 'More energy',
        reminder: 'Stick with it and you get more energy.'
      },
      {
        key: 'better_health',
        label: 'Better health',
        reminder: 'Stick with it and you get better health.'
      },
      {
        key: 'confidence',
        label: 'Confidence in myself',
        reminder: 'Stick with it and you get confidence in yourself.'
      }
    ]
  },
  {
    key: 'lose',
    prompt: "What will you lose if you don't?",
    customReminderPrefix: "What's at stake",
    options: [
      {
        key: 'another_failed_attempt',
        label: "Another attempt that didn't stick",
        reminder: "Today is what keeps this from being another attempt that didn't stick."
      },
      {
        key: 'lost_progress',
        label: "Progress I've already made",
        reminder: "Today is what protects the progress you've already made."
      },
      {
        key: 'lost_proof',
        label: 'A chance to prove this to myself',
        reminder: 'Today is another chance to prove this to yourself.'
      }
    ]
  }
];

export interface ReflectionAnswer {
  question_key: ReflectionQuestionKey;
  choice_key: string | null;
  custom_text: string | null;
}

export function questionFor(key: ReflectionQuestionKey): ReflectionQuestion {
  // Non-null: the four keys are a closed union matching the array above.
  return REFLECTION_QUESTIONS.find((q) => q.key === key)!;
}

// The line shown to the user for a stored answer. Their own words win over the
// canned copy; an answer with neither is treated as unanswered.
export function reminderFor(answer: ReflectionAnswer | undefined | null): string | null {
  if (!answer) return null;

  const custom = answer.custom_text?.trim();
  if (custom) return `${questionFor(answer.question_key).customReminderPrefix}: ${custom}`;

  if (!answer.choice_key || answer.choice_key === CUSTOM_CHOICE_KEY) return null;
  const option = questionFor(answer.question_key).options.find((o) => o.key === answer.choice_key);
  return option?.reminder ?? null;
}

// A reflection counts as answered only if it can actually be resurfaced —
// "Something else" with an empty text field is a question the user skipped.
export function isAnswered(answer: ReflectionAnswer | undefined | null): boolean {
  return reminderFor(answer) !== null;
}

// ============================================================
// Editing state
//
// The form keeps a draft per question rather than a list of answers, so an
// unanswered question and an answer being typed are the same shape. Shared by
// the Step 2 screen and the mid-challenge edit modal.
// ============================================================

export interface ReflectionDraftEntry {
  choiceKey: string | null;
  customText: string;
}

export type ReflectionDraft = Record<ReflectionQuestionKey, ReflectionDraftEntry>;

export function emptyDraft(): ReflectionDraft {
  return REFLECTION_QUESTIONS.reduce((acc, q) => {
    acc[q.key] = { choiceKey: null, customText: '' };
    return acc;
  }, {} as ReflectionDraft);
}

export function draftFromAnswers(answers: ReflectionAnswer[]): ReflectionDraft {
  const draft = emptyDraft();
  for (const a of answers) {
    if (!draft[a.question_key]) continue;
    draft[a.question_key] = {
      // Stored text with no choice means the user typed their own; the form
      // needs "Something else" selected for that text to be visible at all.
      choiceKey: a.choice_key ?? (a.custom_text ? CUSTOM_CHOICE_KEY : null),
      customText: a.custom_text ?? ''
    };
  }
  return draft;
}

export function draftToAnswers(draft: ReflectionDraft): ReflectionAnswer[] {
  return REFLECTION_QUESTIONS.map((q) => {
    const entry = draft[q.key];
    const custom = entry?.customText?.trim() ?? '';
    return {
      question_key: q.key,
      choice_key: entry?.choiceKey ?? null,
      // Text only counts when "Something else" is the live selection —
      // otherwise a stale field left behind by switching back to a chip would
      // silently outrank the chip in reminderFor().
      custom_text: entry?.choiceKey === CUSTOM_CHOICE_KEY && custom ? custom : null
    };
  });
}

export function answeredCount(draft: ReflectionDraft): number {
  return draftToAnswers(draft).filter(isAnswered).length;
}
