import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { activityIcon } from '@/components/home/activityIcons';
import { activityLabel, postMeta, POST_BACKGROUNDS, type PostBackground, type PostKind } from '@/features/community/post-rules';
import { relativeTime } from '@/lib/time';
import { theme } from '@/constants/theme';

// One Community post (decided 10 to 12 Nov 2026). The picture on top: a photo
// from the session, or the words large on a colored background. Under it the
// poster's face and first name, the line they wrote, and who it was with.
//
// "···" sits top right of that area; the clap sits bottom right, under it,
// where the thumb rests, at 44pt tall.

export type PostCardData = {
  kind: PostKind;
  photo_url?: string | null;
  body: string;
  background: PostBackground;
  activity_key: string | null;
  sessions_together: number | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  is_mine: boolean;
  is_partner: boolean;
  claps: number;
  i_clapped: boolean;
};

export function PostCard({
  post,
  height,
  onClap,
  onMore,
  note
}: {
  post: PostCardData;
  height: number;
  onClap?: () => void;
  onMore?: () => void;
  // In place of the time, for the share screen's preview.
  note?: string;
}) {
  const act = activityLabel(post.activity_key);
  const icon = activityIcon(post.activity_key);
  const words = post.body.trim();

  const tags = (
    <>
      {act ? (
        <View style={[styles.tag, styles.tagLeft]}>
          {icon ? <Icon name={icon} size={12} color="#FFFFFF" strokeWidth={2} /> : null}
          <AppText style={styles.tagText}>{act}</AppText>
        </View>
      ) : null}
      {post.sessions_together ? (
        <View style={[styles.tag, styles.tagRight, styles.frame]}>
          <Icon name="fire" size={12} color="#FFFFFF" strokeWidth={2} />
          <AppText style={styles.tagText}>Day {post.sessions_together}</AppText>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.card, { height }]}>
      {post.kind === 'photo' ? (
        <View style={styles.pic}>
          {post.photo_url ? (
            <Image source={{ uri: post.photo_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.noPhoto]} />
          )}
          {tags}
        </View>
      ) : (
        <LinearGradient
          colors={POST_BACKGROUNDS[post.background] ?? POST_BACKGROUNDS.orange}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pic}
        >
          {tags}
          <View style={styles.quoteWrap}>
            <AppText style={styles.quote} numberOfLines={5} adjustsFontSizeToFit minimumFontScale={0.7}>
              {`“${words}”`}
            </AppText>
          </View>
        </LinearGradient>
      )}

      <View style={styles.foot}>
        <Avatar uri={post.author_avatar} name={post.author_name} size={32} />
        <View style={styles.who}>
          {post.is_mine ? <AppText style={styles.mine}>YOU</AppText> : null}
          <AppText style={styles.name} numberOfLines={1}>
            {post.author_name}
          </AppText>
          {post.kind === 'photo' && words ? (
            <AppText style={styles.said} numberOfLines={2}>
              {words}
            </AppText>
          ) : null}
          <AppText style={styles.meta} numberOfLines={1}>
            {note ?? postMeta(post, relativeTime(post.created_at))}
          </AppText>
        </View>
        {onMore || onClap ? (
          <View style={styles.acts}>
            {onMore ? (
              <PressableScale onPress={onMore} haptic="selection" hitSlop={10} accessibilityRole="button" accessibilityLabel="Post options" style={styles.more}>
                <Icon name="dots" size={18} color={theme.colors.muted} />
              </PressableScale>
            ) : (
              <View />
            )}
            {onClap ? (
              <PressableScale
                onPress={onClap}
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel={post.i_clapped ? 'Remove your clap' : 'Clap for this'}
                accessibilityState={{ selected: post.i_clapped }}
                style={[styles.clap, post.i_clapped && styles.clapOn]}
              >
                <Icon name="clap" size={21} color={post.i_clapped ? theme.colors.primary2 : theme.colors.muted} />
                {post.claps > 0 ? (
                  <AppText style={[styles.clapCount, post.i_clapped && styles.clapCountOn]}>{post.claps}</AppText>
                ) : null}
              </PressableScale>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: 22, overflow: 'hidden', ...theme.shadow.sm },
  pic: { flex: 1, minHeight: 0, overflow: 'hidden' },
  noPhoto: { backgroundColor: theme.colors.surface3 },
  tag: {
    position: 'absolute',
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(0,24,39,0.55)',
    zIndex: 2
  },
  tagLeft: { left: 12 },
  tagRight: { right: 12 },
  frame: { backgroundColor: theme.colors.primary2 },
  tagText: { color: '#FFFFFF', fontSize: 11, fontFamily: theme.fonts.bodyBold },
  quoteWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingTop: 36, paddingBottom: 18 },
  quote: { color: '#FFFFFF', fontSize: 19, lineHeight: 26, textAlign: 'center', fontFamily: theme.fonts.bodyMedium },
  foot: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 10, paddingBottom: 12, paddingLeft: 14, paddingRight: 12 },
  who: { flex: 1, minWidth: 0, gap: 1 },
  mine: { fontSize: 9.5, letterSpacing: 0.6, color: theme.colors.primary2, fontFamily: theme.fonts.bodyBold },
  name: { fontSize: 13, color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  said: { fontSize: 12.5, lineHeight: 17, color: theme.colors.text },
  meta: { fontSize: 10.5, color: theme.colors.muted },
  acts: { alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 },
  more: { marginTop: -4, marginRight: -4, padding: 4 },
  clap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 64,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: theme.colors.border
  },
  clapOn: { borderColor: 'rgba(253,131,2,0.45)', backgroundColor: 'rgba(253,131,2,0.10)' },
  clapCount: { fontSize: 13, color: theme.colors.muted, fontFamily: theme.fonts.bodyBold },
  clapCountOn: { color: theme.colors.primary2 }
});
