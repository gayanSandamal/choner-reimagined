// The default invite message, from the prototype: "{Name} is challenging you
// to {activity}. Are you up for it?" Activity only. No distance and no
// cadence: an invite always goes out before a partner exists, so nothing has
// been agreed yet.
const PHRASES: Record<string, string> = {
  running: 'go for a run',
  jogging: 'go for a jog',
  walking: 'go for a walk',
  cycling: 'go for a ride',
  yoga: 'do yoga',
  home_workouts: 'work out'
};

export function inviteMessage(fullName: string | null | undefined, activityKey: string | null | undefined) {
  const first = (fullName ?? '').trim().split(/\s+/)[0];
  const phrase = (activityKey && PHRASES[activityKey]) || 'take on a challenge with them';
  return first
    ? `${first} is challenging you to ${phrase}. Are you up for it?`
    : `I'm challenging you to ${phrase}. Are you up for it?`;
}
