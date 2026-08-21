import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PressableScale } from '@/components/ui/PressableScale';
import { useSetLateNote, useTodayStatus } from '@/features/challenges/hooks';
import { theme } from '@/constants/theme';

// Lets someone who is going to miss their deadline say so before the grace
// window closes. If they add a note, the partner's nudge carries it instead of
// a bare "they haven't checked in".
//
// This is shown to the person who might miss — quietly, as their own status.
// They do get a reminder BEFORE their deadline, but nothing after it: once the
// day is genuinely missed the only notification is the one their partner
// receives, which is the no-guilt-push rule the spec is explicit about.
export function LateNote({ userChallengeId }: { userChallengeId: string }) {
  const statusQ = useTodayStatus(userChallengeId);
  const saveMut = useSetLateNote();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  const saved = statusQ.data?.late_note ?? null;
  const alreadyNudged = Boolean(statusQ.data?.missed_notified_at);

  useEffect(() => {
    if (saved && !open) setNote(saved);
  }, [saved]);

  const onSave = async () => {
    await saveMut.mutateAsync({ userChallengeId, note });
    setOpen(false);
  };

  if (saved && !open) {
    return (
      <View style={styles.wrap}>
        <AppText variant="caption" muted>
          {alreadyNudged
            ? `Your partner was told, and saw: "${saved}"`
            : `Your partner will see: "${saved}"`}
        </AppText>
        <PressableScale onPress={() => setOpen(true)}>
          <AppText variant="caption" style={{ color: theme.colors.primary2 }}>
            Edit note
          </AppText>
        </PressableScale>
      </View>
    );
  }

  if (!open) {
    return (
      <View style={styles.wrap}>
        <PressableScale onPress={() => setOpen(true)}>
          <AppText variant="caption" style={{ color: theme.colors.primary2 }}>
            Running late today?
          </AppText>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Input
        label="Tell your partner"
        placeholder="Running late, doing it tonight"
        value={note}
        onChangeText={setNote}
        maxLength={120}
      />
      <View style={styles.actions}>
        <Button
          label="Save"
          size="sm"
          loading={saveMut.isPending}
          disabled={!note.trim()}
          onPress={onSave}
        />
        <Button label="Cancel" size="sm" variant="ghost" onPress={() => setOpen(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing(0.75), marginTop: theme.spacing(1) },
  actions: { flexDirection: 'row', gap: theme.spacing(1) }
});
