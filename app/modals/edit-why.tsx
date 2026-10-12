import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { ReflectionQuestionList } from '@/components/challenges/ReflectionQuestionList';
import {
  ReflectionDraft,
  draftFromAnswers,
  draftToAnswers,
  emptyDraft
} from '@/features/challenges/reflections';
import {
  useMyChallenge,
  useReflections,
  useSaveReflections
} from '@/features/challenges/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

// Editing the "Why" mid-challenge.
//
// Motivation genuinely shifts over a week or two; locking someone into their
// day-one answer is how the daily reminder starts reading as stale by day 5.
export default function EditWhyModal() {
  const { session } = useSession();
  const userId = session?.user.id;
  const reflectionsQ = useReflections(userId);
  const challengesQ = useMyChallenge(userId);
  const saveReflections = useSaveReflections();

  // Null until the stored answers arrive, so an empty form can never be saved
  // over what the user already wrote.
  const [draft, setDraft] = useState<ReflectionDraft | null>(null);
  useEffect(() => {
    if (draft === null && reflectionsQ.data) setDraft(draftFromAnswers(reflectionsQ.data));
  }, [reflectionsQ.data, draft]);

  const onSave = async () => {
    if (!userId || !draft) return;
    try {
      await saveReflections.mutateAsync({
        userId,
        userChallengeId: challengesQ.data?.id ?? null,
        answers: draftToAnswers(draft)
      });
      router.back();
    } catch (error: any) {
      notify('Could not save your answers', error.message);
    }
  };

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      {/* The prototype's .hdr for a modal (app_b.js:712, bar and nav both
          empty): the title at 16/600 on the left, a plain close on the right.
          Not the shared ScreenHeader, whose 44px circled button and Light-300
          title are the "old style" in #135. ScreenHeader is on 17 other
          screens, so it is left alone here rather than restyled app-wide. */}
      <View style={styles.hdr}>
        <AppText style={styles.hdrTitle}>Why you&apos;re doing this</AppText>
        <PressableScale
          haptic="light"
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={styles.hdrClose}
        >
          <Icon name="x" size={20} color={theme.colors.muted} strokeWidth={2} />
        </PressableScale>
      </View>
      {reflectionsQ.isLoading ? (
        <LoadingState />
      ) : reflectionsQ.isError ? (
        <ErrorState
          message={(reflectionsQ.error as Error).message}
          onRetry={() => reflectionsQ.refetch()}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AppText style={styles.sub}>Change these any time. They stay private to you.</AppText>
            <ReflectionQuestionList
              draft={draft ?? emptyDraft()}
              onChange={setDraft}
              animate={false}
            />
          </ScrollView>
          <View style={styles.footer}>
            <Button
              label="Save"
              loading={saveReflections.isPending}
              disabled={!draft}
              onPress={onSave}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 0 },
  // .hdr: row, centred, 2 above and 18 below.
  hdr: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, marginBottom: 18 },
  // .ht: 16/600, taking the row.
  hdrTitle: {
    flex: 1,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
    color: theme.colors.text
  },
  hdrClose: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  // .p-sub: 13, muted, 1.55 line height, 20 below.
  sub: {
    fontFamily: theme.fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.muted,
    marginBottom: 4
  },
  content: { gap: theme.spacing(2), paddingBottom: theme.spacing(3), flexGrow: 1 },
  footer: { paddingTop: theme.spacing(1) }
});
