import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { ReflectionQuestionList } from '@/components/challenges/ReflectionQuestionList';
import {
  ReflectionDraft,
  draftFromAnswers,
  draftToAnswers,
  emptyDraft
} from '@/features/challenges/reflections';
import {
  useDefaultChallenges,
  useReflections,
  useSaveReflections
} from '@/features/challenges/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';

// Editing the "Why" mid-challenge.
//
// Motivation genuinely shifts over a week or two; locking someone into their
// day-one answer is how the daily reminder starts reading as stale by day 5.
export default function EditWhyModal() {
  const { session } = useSession();
  const userId = session?.user.id;
  const reflectionsQ = useReflections(userId);
  const challengesQ = useDefaultChallenges(userId);
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
        userChallengeId: challengesQ.data?.partner?.id ?? challengesQ.data?.solo?.id ?? null,
        answers: draftToAnswers(draft)
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Could not save your answers', error.message);
    }
  };

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <ScreenHeader title="Why you're doing this" onClose={() => router.back()} />
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
            <AppText muted>
              Change these any time — we'll use the new answers in tomorrow's reminder.
            </AppText>
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
  content: { gap: theme.spacing(3), paddingBottom: theme.spacing(3), flexGrow: 1 },
  footer: { paddingTop: theme.spacing(1) }
});
