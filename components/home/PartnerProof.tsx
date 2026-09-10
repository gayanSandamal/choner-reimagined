import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { getCheckinPhotoUrl } from '@/features/challenges/api';
import { useMarkCheckinPhotoViewed } from '@/features/challenges/hooks';
import type { PartnerProofPhoto } from '@/features/community/api';
import { theme } from '@/constants/theme';

// Today's proof from the partner. The partner reviewing this IS the
// verification — there is no automated photo analysis by design.
//
// Photos live in a private bucket, so each render signs a short-lived URL
// rather than holding a permanent link. Storage RLS is what actually enforces
// "partner only"; this component just displays what it is allowed to fetch.
//
// Ephemeral: every photo shown here belongs to the partner, never the viewer
// themselves, so simply rendering one here IS the "view" that starts its
// countdown to deletion. `seen` dedupes so remounts/re-renders don't refire
// the mutation for a photo already marked.
export function PartnerProof({
  photos,
  partnerName
}: {
  photos: PartnerProofPhoto[];
  partnerName: string;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const markViewed = useMarkCheckinPhotoViewed();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    if (photos.length === 0) {
      setUrls([]);
      return;
    }
    Promise.all(photos.map((p) => getCheckinPhotoUrl(p.photo_path)))
      .then((signed) => {
        if (!cancelled) {
          setUrls(signed);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // Path list is the identity here — re-sign only when the photos change.
  }, [photos.map((p) => p.photo_path).join('|')]);

  useEffect(() => {
    if (urls.length === 0 || failed) return;
    for (const photo of photos) {
      if (seen.current.has(photo.id)) continue;
      seen.current.add(photo.id);
      markViewed.mutate(photo.id);
    }
    // Fires once per successfully-signed batch; `seen` is what prevents a
    // repeat call, not this dependency list.
  }, [urls, failed]);

  if (photos.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" muted>
        {partnerName}'s proof today
      </AppText>
      {failed ? (
        <AppText variant="caption" muted>
          Couldn't load the photo right now.
        </AppText>
      ) : (
        <View style={styles.row}>
          {urls.map((url) => (
            <Image key={url} source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing(0.75), marginTop: theme.spacing(1) },
  row: { flexDirection: 'row', gap: theme.spacing(1), flexWrap: 'wrap' },
  thumb: {
    width: 92,
    height: 92,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface2
  }
});
