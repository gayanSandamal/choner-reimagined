import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/PressableScale';
import { LoadingState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

// Whole hours only. A prototype does not need minute precision, and a short
// list is far quicker than a wheel picker.
const CHOICES = ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

function label(hhmm: string) {
  const h = Number(hhmm.slice(0, 2));
  const suffix = h >= 12 ? 'pm' : 'am';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${suffix}`;
}

function hour(h: number) {
  return label(`${String(h).padStart(2, '0')}:00`);
}

// Two different things happen around this deadline and they are easy to
// conflate, so both are spelled out.
//
// Before it, you get a reminder — 2 hours ahead, never before 8am. That is not
// the guilt-push the spec rules out: nothing has been missed yet and the whole
// point is that it still can be avoided.
//
// After it, your partner is told. That grace is a clamp rather than a fixed
// offset — 3 hours, but never past 22:00 local — so the nudge always lands
// while there is still some day left to act on.
function explain(hhmm: string) {
  const h = Number(hhmm.slice(0, 2));

  const remindAt = Math.max(h - 2, 8);
  const mine =
    remindAt < h
      ? `We'll remind you at ${hour(remindAt)} if you haven't logged.`
      : `Too early for a reminder before it.`;

  const naive = h + 3;
  const theirs =
    naive <= 22
      ? `Your partner is told at ${hour(naive)} if you still haven't.`
      : h < 22
      ? `Your partner is told at 10:00 pm if you still haven't.`
      : `Too late for a same-day nudge — your partner is told at 8:00 am tomorrow instead.`;

  return `${mine} ${theirs}`;
}

export default function DeadlineSettingsScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const updateMut = useUpdateProfile();

  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    const current = (profileQ.data as any)?.daily_deadline as string | undefined;
    if (current && !choice) setChoice(current.slice(0, 5));
  }, [profileQ.data]);

  const onSave = async () => {
    if (!userId || !choice) return;
    try {
      await updateMut.mutateAsync({
        userId,
        payload: {
          daily_deadline: `${choice}:00`,
          // Captured from the device rather than asked for: a deadline stored
          // without a zone fires at the wrong local hour for everyone but UTC.
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        } as any
      });
      router.back();
    } catch (e: any) {
      notify("Couldn't save", e.message);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Daily deadline" onBack={() => router.back()} />

      {profileQ.isLoading ? (
        <LoadingState />
      ) : (
        <>
          <AppText muted>
            The time your day is measured against. We'll remind you before it. Miss it, and your
            partner is the one who's told.
          </AppText>

          <Card style={styles.list}>
            {CHOICES.map((c) => {
              const selected = choice === c;
              return (
                <PressableScale key={c} onPress={() => setChoice(c)}>
                  <View style={[styles.row, selected && styles.rowSelected]}>
                    <AppText style={selected ? { color: theme.colors.primary2 } : undefined}>
                      {label(c)}
                    </AppText>
                  </View>
                </PressableScale>
              );
            })}
          </Card>

          {choice ? (
            <AppText variant="caption" muted>
              {explain(choice)}
            </AppText>
          ) : null}

          <Button
            label="Save deadline"
            disabled={!choice}
            loading={updateMut.isPending}
            onPress={onSave}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.spacing(0.5) },
  row: {
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1),
    borderRadius: theme.radius.sm
  },
  rowSelected: { backgroundColor: theme.colors.surface2 }
});
