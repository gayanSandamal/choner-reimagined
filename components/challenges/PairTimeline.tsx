import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/StateViews';
import { usePairCheckins, useMarkCheckinPhotoViewed } from '@/features/challenges/hooks';
import { getCheckinPhotoUrl } from '@/features/challenges/api';
import { relativeTime } from '@/lib/time';
import { theme } from '@/constants/theme';

// Both partners' check-ins, interleaved by time — the thing that makes the
// app feel like a real, shared product rather than two solo checklists.
// No comments, no likes, no pagination: just visibility.
export function PairTimeline({
  userId,
  partnerName
}: {
  userId: string;
  partnerName?: string | null;
}) {
  const checkinsQ = usePairCheckins(userId);
  const events = checkinsQ.data ?? [];

  const [urls, setUrls] = useState<Record<string, string>>({});
  const photoPaths = events.map((e) => e.photo_path).filter(Boolean) as string[];
  const markViewed = useMarkCheckinPhotoViewed();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    if (photoPaths.length === 0) {
      setUrls({});
      return;
    }
    Promise.all(photoPaths.map((path) => getCheckinPhotoUrl(path).then((url) => [path, url] as const)))
      .then((pairs) => {
        if (!cancelled) setUrls(Object.fromEntries(pairs));
      })
      .catch(() => {
        // Signing failures fall back to no-photo rows rather than an error
        // state — the note and timestamp are still worth showing.
      });
    return () => {
      cancelled = true;
    };
    // Path list is the identity here — re-sign only when the set changes.
  }, [photoPaths.join('|')]);

  // Ephemeral: a partner's photo (never the viewer's own) starts its
  // countdown to deletion the moment its signed URL actually renders here.
  // `seen` dedupes so a refetch of the same event doesn't refire the mutation.
  useEffect(() => {
    for (const event of events) {
      if (event.user_id === userId) continue;
      if (!event.photo_path || !urls[event.photo_path]) continue;
      if (seen.current.has(event.id)) continue;
      seen.current.add(event.id);
      markViewed.mutate(event.id);
    }
  }, [events, urls, userId]);

  if (checkinsQ.isLoading) return null;

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" muted>
        Check-ins
      </AppText>

      {events.length === 0 ? (
        <EmptyState title="No check-ins yet — be the first." />
      ) : (
        <View style={styles.list}>
          {events.map((event) => {
            const mine = event.user_id === userId;
            const name = mine ? 'You' : firstName(event.name ?? partnerName);
            const url = event.photo_path ? urls[event.photo_path] : undefined;
            return (
              <View key={event.id} style={styles.row}>
                <Avatar uri={event.avatar_url} name={event.name} size={30} />
                <View style={styles.body}>
                  <AppText style={styles.text}>
                    <AppText style={styles.name}>{name}</AppText> logged {event.task_title}
                  </AppText>
                  {event.note ? (
                    <AppText variant="caption" muted>
                      {event.note}
                    </AppText>
                  ) : null}
                  {url ? (
                    <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
                  ) : null}
                  <AppText style={styles.time}>{relativeTime(event.completed_at)}</AppText>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function firstName(name?: string | null) {
  return (name ?? 'Your partner').trim().split(/\s+/)[0] || 'Your partner';
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing(0.75) },
  list: { gap: theme.spacing(1.5) },
  row: { flexDirection: 'row', gap: theme.spacing(1.5) },
  body: { flexShrink: 1, flexGrow: 1, gap: 4 },
  text: { color: theme.colors.text, fontSize: 12.5, lineHeight: 18 },
  name: { fontFamily: theme.fonts.bodyBold },
  time: { color: theme.colors.muted, fontSize: 10 },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface2,
    marginTop: 2
  }
});
