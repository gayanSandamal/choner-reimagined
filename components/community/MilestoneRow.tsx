import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import type { FeedItem, MilestoneKind } from '@/features/community/milestones';
import { theme } from '@/constants/theme';

const ORANGE_SOFT = '#ffb355';
const GREEN = '#4fc98a';

// Relative time, coarse on purpose — an exact timestamp on someone else's
// streak is noise, and "3d" is all the reader needs.
function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

const BADGES: Record<MilestoneKind, { label: string; color: string }> = {
  streak: { label: 'Streak', color: ORANGE_SOFT },
  complete: { label: 'Complete', color: GREEN },
  // Neutral by design: a Find success story is proof, not a trophy.
  matched: { label: 'Matched', color: theme.colors.muted }
};

function describe(item: FeedItem) {
  switch (item.kind) {
    case 'streak':
      return `hit a ${item.streak_days ?? 7}-day streak`;
    case 'complete':
      return `completed ${item.habit_title ? `“${item.habit_title}”` : 'their challenge'}`;
    case 'matched':
      return `found a partner for ${item.habit_title ? `“${item.habit_title}”` : 'a new habit'}`;
  }
}

// One opted-in moment from someone else in your city. No comments, no profile
// link, no way to request a pairing — reading it is the entire interaction,
// apart from a single tap to say well done.
export function MilestoneRow({
  item,
  onReact
}: {
  item: FeedItem;
  onReact: () => void;
}) {
  const badge = BADGES[item.kind];
  const names = item.partner_name
    ? `${item.sharer_name} & ${item.partner_name}`
    : item.sharer_name;

  return (
    <View style={styles.row}>
      <View style={styles.avatars}>
        <Avatar uri={item.sharer_avatar} name={item.sharer_name} size={30} />
        {item.partner_name ? (
          <View style={styles.overlap}>
            <Avatar uri={item.partner_avatar} name={item.partner_name} size={30} />
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <AppText style={styles.text}>
          <AppText style={styles.names}>{names}</AppText> {describe(item)}
        </AppText>
        <View style={styles.metaRow}>
          <View style={[styles.badge, { borderColor: `${badge.color}55` }]}>
            <AppText style={[styles.badgeText, { color: badge.color }]}>{badge.label}</AppText>
          </View>
          <AppText style={styles.time}>{relativeTime(item.created_at)}</AppText>
        </View>
      </View>

      <PressableScale
        onPress={onReact}
        haptic="selection"
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={item.i_reacted ? 'Remove your reaction' : 'React to this'}
        style={[styles.react, item.i_reacted && styles.reactOn]}
      >
        <AppText style={styles.reactEmoji}>👏</AppText>
        {item.reactions > 0 ? (
          <AppText style={styles.reactCount}>{item.reactions}</AppText>
        ) : null}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    paddingVertical: theme.spacing(1.5)
  },
  avatars: { flexDirection: 'row' },
  overlap: { marginLeft: -12 },
  body: { flexShrink: 1, flexGrow: 1, gap: 4 },
  text: { color: theme.colors.text, fontSize: 12.5, lineHeight: 18 },
  names: { fontFamily: theme.fonts.bodyBold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 9, letterSpacing: 0.8, fontFamily: theme.fonts.bodyBold },
  time: { color: theme.colors.muted, fontSize: 10 },
  react: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  reactOn: { borderColor: 'rgba(254,140,0,0.45)', backgroundColor: 'rgba(254,140,0,0.10)' },
  reactEmoji: { fontSize: 13 },
  reactCount: { color: theme.colors.muted, fontSize: 11 }
});
