import { useEffect, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TopBarPill, useTopBarClearance } from '@/components/navigation/AppTopBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { KeyboardFooterScroll } from '@/components/ui/keyboard';
import { PostCard } from '@/components/community/PostCard';
import { captureProofPhoto } from '@/features/challenges/capture';
import { useCreateCommunityPost } from '@/features/community/hooks';
import {
  POST_BACKGROUNDS,
  POST_LIMIT,
  POST_PROMPT,
  POST_SUGGESTIONS,
  postProblem,
  postProblemMessage,
  type PostBackground,
  type PostKind
} from '@/features/community/post-rules';
import { copyCheckinPhoto, latestCheckinPhoto, uploadCommunityPhoto, type PostResult } from '@/features/community/posts';
import { useProfile } from '@/features/profile/hooks';
import { useSession } from '@/providers/session-provider';
import { notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

// Share today's session to Community (decided 10 to 12 Nov 2026). Offered at
// the end of a session, never anywhere else.
//
// A photo or just words. The photo is the check-in photo from today, or a new
// one from the live camera (never the gallery). It goes up at once with your
// first name. No partner approval and no "who is in it" question; your
// partner is told, and can remove it.
export default function ShareToCommunityScreen() {
  const { challengeId, activityKey } = useLocalSearchParams<{ challengeId?: string; activityKey?: string }>();
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const clearance = useTopBarClearance();
  const create = useCreateCommunityPost();

  const [kind, setKind] = useState<PostKind>('photo');
  const [checkin, setCheckin] = useState<{ path: string; url: string } | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [source, setSource] = useState<'checkin' | 'new'>('new');
  const [said, setSaid] = useState('');
  const [bg, setBg] = useState<PostBackground>('orange');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!challengeId) return;
    latestCheckinPhoto(String(challengeId)).then((c) => {
      setCheckin(c);
      if (c) setSource('checkin');
    });
  }, [challengeId]);

  const photoUrl = source === 'checkin' ? checkin?.url ?? null : fresh ? `data:image/jpeg;base64,${fresh}` : null;
  const left = POST_LIMIT - said.length;
  const name = (profileQ.data?.full_name ?? 'You').split(' ')[0];

  const takeNew = async () => {
    const shot = await captureProofPhoto();
    if (shot.status === 'captured') {
      setFresh(shot.base64);
      setSource('new');
    } else if (shot.status === 'unavailable') {
      notify('No camera here', 'Share just words instead, or use your phone.');
    }
  };

  const onShare = async () => {
    const problem = postProblem(kind, said);
    if (problem) return setError(postProblemMessage(problem));
    if (kind === 'photo' && !photoUrl) return setError('Take a photo first, or share just words.');
    if (!userId) return;
    setBusy(true);
    try {
      let path: string | null = null;
      if (kind === 'photo') {
        path = source === 'checkin' && checkin ? await copyCheckinPhoto(userId, checkin.url) : await uploadCommunityPhoto(userId, fresh!);
      }
      const res = (await create.mutateAsync({
        kind,
        body: said.trim(),
        background: bg,
        photoPath: path,
        activityKey: activityKey ? String(activityKey) : null
      })) as PostResult;
      if (!res.ok) return setError(postProblemMessage(res.reason));
      notify('Shared', 'It is on Community now. Your partner gets a note that you posted.');
      router.replace('/(tabs)/community');
    } catch (e: any) {
      setError(e?.message ?? postProblemMessage(''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <TopBarPill
        title="You both showed up"
        left={
          <PressableScale onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={theme.colors.onNavy} />
          </PressableScale>
        }
      />
      <KeyboardFooterScroll
        contentContainerStyle={[styles.content, { paddingTop: clearance }]}
        footerStyle={styles.footer}
        footer={
          <View style={styles.footerInner}>
            <Button label="Share to inspire" loading={busy} onPress={onShare} />
            <Button label="Not now" variant="ghost" disabled={busy} onPress={() => router.back()} />
          </View>
        }
      >
        <AppText style={styles.title}>
          Share today's <AppText style={styles.titleEm}>session?</AppText>
        </AppText>
        <AppText style={styles.hint}>It goes on Community with your first name.</AppText>

        <View style={styles.row}>
          <Choice icon="camera" label="A photo" on={kind === 'photo'} onPress={() => setKind('photo')} />
          <Choice icon="text" label="Just words" on={kind === 'text'} onPress={() => setKind('text')} />
        </View>

        {kind === 'photo' ? (
          <View style={styles.row}>
            {checkin ? (
              <Choice icon="camera" label="Your check-in photo" on={source === 'checkin'} onPress={() => setSource('checkin')} />
            ) : null}
            <Choice icon="sun" label={fresh ? 'Retake' : 'Take a new one'} on={source === 'new' && !!fresh} onPress={takeNew} />
          </View>
        ) : null}

        <TextInput
          value={said}
          onChangeText={(t) => {
            setSaid(t);
            setError('');
          }}
          placeholder={POST_PROMPT}
          placeholderTextColor={theme.colors.muted}
          multiline
          maxLength={POST_LIMIT + 20}
          style={styles.input}
          accessibilityLabel={POST_PROMPT}
        />
        <AppText style={[styles.count, left < 0 && styles.countOver]}>{left} left</AppText>

        <View style={styles.sugs}>
          {POST_SUGGESTIONS.map((s) => (
            <PressableScale key={s} onPress={() => setSaid(s)} haptic="selection" style={styles.sug} accessibilityRole="button">
              <AppText style={styles.sugText}>{s}</AppText>
            </PressableScale>
          ))}
        </View>

        {kind === 'text' ? (
          <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Background">
            {(Object.keys(POST_BACKGROUNDS) as PostBackground[]).map((k) => (
              <PressableScale
                key={k}
                onPress={() => setBg(k)}
                accessibilityRole="radio"
                accessibilityState={{ selected: bg === k }}
                accessibilityLabel={`${k} background`}
                style={[styles.swatchRing, bg === k && styles.swatchOn]}
              >
                <LinearGradient colors={POST_BACKGROUNDS[k]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatch} />
              </PressableScale>
            ))}
          </View>
        ) : null}

        {error ? (
          <AppText style={styles.error} accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}

        <AppText style={styles.label}>PREVIEW</AppText>
        <PostCard
          height={300}
          note="just now"
          post={{
            kind,
            photo_url: photoUrl,
            body: kind === 'text' ? said.trim() || POST_PROMPT : said,
            background: bg,
            activity_key: activityKey ? String(activityKey) : null,
            sessions_together: null,
            created_at: new Date().toISOString(),
            author_name: name,
            author_avatar: profileQ.data?.avatar_url ?? null,
            is_mine: true,
            is_partner: false,
            claps: 0,
            i_clapped: false
          }}
        />
        {Platform.OS === 'web' ? <AppText style={styles.hint}>Photos need the phone's camera.</AppText> : null}
      </KeyboardFooterScroll>
    </SafeAreaView>
  );
}

function Choice({ icon, label, on, onPress }: { icon: IconName; label: string; on: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      style={[styles.choice, on && styles.choiceOn]}
    >
      <Icon name={icon} size={22} color={on ? theme.colors.primary2 : theme.colors.muted} />
      <AppText style={styles.choiceText}>{label}</AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 22, paddingBottom: 24, gap: 14 },
  footer: { paddingHorizontal: 22 },
  footerInner: { gap: 4 },
  title: { fontSize: 22, lineHeight: 28, color: theme.colors.text, marginTop: 8 },
  titleEm: { fontSize: 22, lineHeight: 28, color: theme.colors.primary2, fontFamily: theme.fonts.bodyBold },
  hint: { fontSize: 12.5, lineHeight: 19, color: theme.colors.muted, marginTop: -6 },
  row: { flexDirection: 'row', gap: 10 },
  choice: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  choiceOn: { borderColor: theme.colors.primary2, backgroundColor: 'rgba(253,131,2,0.10)' },
  choiceText: { fontSize: 12.5, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium, textAlign: 'center' },
  input: {
    minHeight: 76,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    fontFamily: theme.fonts.body,
    textAlignVertical: 'top'
  },
  count: { fontSize: 10.5, color: theme.colors.muted, textAlign: 'right', marginTop: -10 },
  countOver: { color: theme.colors.danger },
  sugs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sug: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: theme.colors.surface },
  sugText: { fontSize: 11.5, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  swatches: { flexDirection: 'row', gap: 10 },
  swatchRing: { padding: 2, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: theme.colors.text },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  error: { fontSize: 12, color: theme.colors.danger, marginTop: -6 },
  label: { fontSize: 10.5, letterSpacing: 1, color: theme.colors.muted }
});
