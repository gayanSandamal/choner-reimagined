import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { milestoneLine } from '@/features/community/milestone-copy';
import type { FeedItem } from '@/features/community/milestones';
import { relativeTime } from '@/lib/time';
import { theme } from '@/constants/theme';

// One opted-in moment from someone else in your city. No comments, no profile
// link, no way to request a pairing — reading it is the entire interaction,
// apart from a single tap to say well done.
//
// Drawn as the prototype's .post (#116): its own white card, the face, the
// names in bold, the line under them and the time.
export function MilestoneRow({
  item,
  onReact
}: {
  item: FeedItem;
  onReact: () => void;
}) {
  const names = item.partner_name ? `${item.sharer_name} and ${item.partner_name}` : item.sharer_name;
  const line = milestoneLine(item);

  return (
    <View style={styles.row}>
      <Avatar uri={item.sharer_avatar} name={item.sharer_name} size={38} />

      <View style={styles.body}>
        <AppText style={styles.names}>{names}</AppText>
        <AppText style={styles.text}>{line.charAt(0).toUpperCase() + line.slice(1)}.</AppText>
        <AppText style={styles.time}>{relativeTime(item.created_at)}</AppText>
      </View>

      {/* A session post has no milestone row to react to. */}
      {item.kind === 'session_together' ? null : (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // .post
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...theme.shadow.sm
  },
  body: { flexShrink: 1, flexGrow: 1, gap: 2 },
  names: { fontSize: 13, color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  text: { color: theme.colors.text, fontSize: 12.5, lineHeight: 18 },
  time: { color: theme.colors.muted, fontSize: 10.5 },
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
  reactOn: { borderColor: 'rgba(253,131,2,0.45)', backgroundColor: 'rgba(253,131,2,0.10)' },
  reactEmoji: { fontSize: 13 },
  reactCount: { color: theme.colors.muted, fontSize: 11 }
});
