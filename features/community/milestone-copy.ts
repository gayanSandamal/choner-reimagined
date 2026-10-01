// What a milestone row says after the names. Kept apart from the feed query
// so it can be tested without a client.
//
// `streak_days` is the column's old name. It now carries a number of
// SESSIONS: the product stopped counting days when the daily check-in went.
export function milestoneLine(item: {
  kind: 'streak' | 'complete' | 'matched' | 'session_together';
  habit_title: string | null;
  streak_days: number | null;
}): string {
  switch (item.kind) {
    case 'streak':
      return item.streak_days ? `kept a ${item.streak_days} session streak` : 'kept their streak going';
    case 'complete':
      return `finished ${item.habit_title ? `“${item.habit_title}”` : 'their challenge'}`;
    case 'matched':
      return `found a partner for ${item.habit_title ? `“${item.habit_title}”` : 'something new'}`;
    case 'session_together':
      // "Dinesh & Gayan just finished their run together".
      return `just finished their ${item.habit_title ?? 'session'} together`;
  }
}
