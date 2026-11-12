import { useState } from 'react';
import { LayoutChangeEvent, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTopBar, useTopBar } from '@/components/navigation/AppTopBar';
import { useTabBarClearance } from '@/components/navigation/CustomTabBar';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { PostCard } from '@/components/community/PostCard';
import {
  useBlockCommunityAuthor,
  useCommunityFeed,
  useHideCommunityPost,
  useRemoveCommunityPost,
  useReportCommunityPost,
  useToggleCommunityClap
} from '@/features/community/hooks';
import type { CommunityPost } from '@/features/community/posts';
import { confirmAction, notify } from '@/lib/alert';
import { usePullRefresh } from '@/lib/use-pull-refresh';
import { theme } from '@/constants/theme';

const GAP = 12;

// Community: a feed of what people in your city chose to share after a
// session (decided 10 to 12 Nov 2026). Like a photo feed, two posts to a
// screen: a photo from the session, or just words on a color.
//
// Still no post button here, no comments, no profiles and no messages.
// Sharing is only ever offered at the end of a real session.
export default function CommunityScreen() {
  const tabBarClearance = useTabBarClearance();
  const topBar = useTopBar();
  const insets = useSafeAreaInsets();
  const feedQ = useCommunityFeed();
  const clap = useToggleCommunityClap();
  const hide = useHideCommunityPost();
  const report = useReportCommunityPost();
  const block = useBlockCommunityAuthor();
  const remove = useRemoveCommunityPost();
  const [viewport, setViewport] = useState(0);
  const [menu, setMenu] = useState<CommunityPost | null>(null);

  const { refreshing, onRefresh } = usePullRefresh(() => feedQ.refetch());
  const items = feedQ.data ?? [];

  // Two cards fill the space between the top bar and the tab bar.
  const cardHeight = Math.max(240, Math.floor((viewport - topBar.contentTop - tabBarClearance - GAP) / 2));
  const onLayout = (e: LayoutChangeEvent) => setViewport(e.nativeEvent.layout.height);

  const run = async (fn: () => Promise<any>, done: string) => {
    try {
      const res = await fn();
      if (res && res.ok === false) {
        notify('Could not do that', 'Please try again.');
        return;
      }
      if (done) notify(done.split('|')[0], done.split('|')[1]);
    } catch (error: any) {
      notify('Could not do that', error.message);
    }
  };

  const act = async (what: 'remove' | 'hide' | 'report' | 'block') => {
    const post = menu;
    setMenu(null);
    if (!post) return;
    // iOS drops an alert presented while a Modal is still animating out.
    await new Promise((r) => setTimeout(r, 300));
    if (what === 'hide') return run(() => hide.mutateAsync(post.id), '');
    if (what === 'report') return run(() => report.mutateAsync(post.id), 'Reported|We look at every report within 24 hours.');
    if (what === 'remove') {
      const ok = await confirmAction({
        title: 'Remove this post?',
        message: `It comes down for everyone, and ${post.author_name} gets a note that you took it down.`,
        confirmLabel: 'Remove',
        cancelLabel: 'Keep it',
        destructive: true
      });
      if (ok) run(() => remove.mutateAsync(post.id), '');
      return;
    }
    const ok = await confirmAction({
      title: `Block ${post.author_name}?`,
      message: "You won't see them on Choner again, and they won't see you.",
      confirmLabel: 'Block',
      cancelLabel: 'Cancel',
      destructive: true
    });
    if (ok) run(() => block.mutateAsync(post.id), `Blocked|You won't see ${post.author_name} again.`);
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      <AppTopBar />
      <ScrollView
        {...topBar.scrollProps}
        contentContainerStyle={[styles.content, { paddingTop: topBar.contentTop, paddingBottom: tabBarClearance }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={topBar.progressViewOffset}
            tintColor={theme.colors.primary}
          />
        }
      >
        <AppText style={styles.pageTitle}>Community</AppText>

        {feedQ.isLoading ? (
          <LoadingState />
        ) : feedQ.isError ? (
          <ErrorState message={(feedQ.error as Error).message} onRetry={() => feedQ.refetch()} />
        ) : items.length === 0 ? (
          // Early-launch emptiness is expected, not an error.
          <View style={styles.empty}>
            <Icon name="leaf" size={24} color={theme.colors.muted} />
            <AppText style={styles.emptyText}>
              Nothing here yet.{'\n'}Finish a session and be one of the first to share it.
            </AppText>
          </View>
        ) : (
          <View style={styles.feed}>
            {items.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                height={cardHeight}
                // Your own posts take no clap, and their menu has only Remove.
                onClap={post.is_mine ? undefined : () => clap.mutate(post.id)}
                onMore={() => setMenu(post)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={styles.scrim} onPress={() => setMenu(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: 18 + insets.bottom }]} onPress={() => {}}>
            {menu ? (
              <>
                <AppText style={styles.sheetTitle}>{menu.is_mine ? 'Your post' : `${menu.author_name}'s post`}</AppText>
                {/* The poster, or their partner, can take it down for everyone
                    at once, without waiting for a review. */}
                {menu.is_mine || menu.is_partner ? (
                  <SheetRow
                    label="Remove this post"
                    sub={menu.is_mine ? 'It comes down for everyone.' : `You are ${menu.author_name}'s partner. It comes down for everyone, straight away.`}
                    warn
                    onPress={() => act('remove')}
                  />
                ) : null}
                {menu.is_mine ? null : (
                  <>
                    <SheetRow label="Hide this post" onPress={() => act('hide')} />
                    <SheetRow label="Report this post" onPress={() => act('report')} />
                    {/* Not on your own partner's post: ending or blocking a
                        partner is Find's job. */}
                    {menu.is_partner ? null : <SheetRow label={`Block ${menu.author_name}`} warn onPress={() => act('block')} />}
                  </>
                )}
                <SheetRow label="Cancel" onPress={() => setMenu(null)} />
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SheetRow({ label, sub, warn, onPress }: { label: string; sub?: string; warn?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <AppText style={[styles.rowLabel, warn && styles.rowWarn]}>{label}</AppText>
      {sub ? <AppText style={styles.rowSub}>{sub}</AppText> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 16 },
  pageTitle: {
    fontFamily: theme.fonts.body,
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: theme.colors.text,
    marginBottom: 14,
    paddingHorizontal: 6
  },
  feed: { gap: GAP },
  empty: { alignItems: 'center', paddingVertical: theme.spacing(5), gap: theme.spacing(1.5) },
  emptyText: { color: theme.colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 19 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,24,39,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 18, paddingHorizontal: 22 },
  sheetTitle: { fontSize: 15, color: theme.colors.text, fontFamily: theme.fonts.bodyBold, marginBottom: 6 },
  row: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 14 },
  rowPressed: { opacity: 0.6 },
  rowLabel: { fontSize: 14.5, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  rowWarn: { color: theme.colors.danger },
  rowSub: { fontSize: 11.5, color: theme.colors.muted, marginTop: 2 }
});
