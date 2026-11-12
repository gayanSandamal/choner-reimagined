// The rules for a Community post, kept apart from the client so they can be
// tested without one. The server checks the same things in
// create_community_post() (202611121000); this is so the person is told before
// they tap, not after.

export const POST_LIMIT = 140;

export type PostKind = 'photo' | 'text';
export type PostBackground = 'orange' | 'navy' | 'green' | 'violet';

// A words-only post sits on one of these, always with white words on top.
export const POST_BACKGROUNDS: Record<PostBackground, readonly [string, string]> = {
  orange: ['#FD8302', '#FD5B01'],
  navy: ['#13324A', '#001827'],
  green: ['#2E9E6B', '#1F6B47'],
  violet: ['#7A5BD6', '#4B3596']
};

// Tap-to-use lines for someone who doesn't know what to write.
export const POST_SUGGESTIONS = [
  "Didn't want to, did it anyway",
  'We kept each other going',
  'New best',
  'Rain did not win today'
] as const;

export const POST_PROMPT = 'Inspire others with a thought';

// Contact details turn the feed into a way to reach strangers, which Find is
// deliberately not: phone numbers, @handles and links.
const CONTACT = /(\+?\d[\d\s-]{7,}\d)|(@[a-z0-9_.]{2,})|(https?:\/\/|www\.)/i;

export type PostProblem = 'empty' | 'too_long' | 'contact_details';

export function postProblem(kind: PostKind, body: string): PostProblem | null {
  const t = body.trim();
  if (kind === 'text' && !t) return 'empty';
  if (t.length > POST_LIMIT) return 'too_long';
  if (CONTACT.test(t)) return 'contact_details';
  return null;
}

export function postProblemMessage(p: PostProblem | string): string {
  switch (p) {
    case 'empty':
      return 'Write a line first, or share a photo instead.';
    case 'too_long':
      return `Keep it to ${POST_LIMIT} characters.`;
    case 'contact_details':
      return 'Leave out phone numbers, @handles and links. Community is for the moment, not for contact details.';
    default:
      return 'Could not share that. Please try again.';
  }
}

// "Walking", "Running", ... for the label on the picture.
const ACTIVITY_LABELS: Record<string, string> = {
  walking: 'Walking',
  running: 'Running',
  jogging: 'Jogging',
  cycling: 'Cycling',
  workouts: 'Workouts',
  yoga: 'Yoga'
};
export function activityLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return ACTIVITY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

// The line under a name: "Walking with their partner · 2h", or "with you"
// when the poster is your partner.
export function postMeta(p: { activity_key: string | null; is_partner: boolean }, when: string): string {
  const act = activityLabel(p.activity_key);
  const lead = act ? `${act} with ${p.is_partner ? 'you' : 'their partner'}` : null;
  return [lead, when].filter(Boolean).join(' · ');
}
