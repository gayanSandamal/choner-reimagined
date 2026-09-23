import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PressableScale } from '@/components/ui/PressableScale';
import { COPY } from '@/features/plans/copy';
import { meetupMessageProblem, PROBLEM_MESSAGE, type MessageProblem } from '@/features/plans/chat-filter';
import { useMeetupChat, useSendMeetupMessage } from '@/features/plans/hooks';
import type { PairPlan } from '@/features/plans/types';
import { notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

// The temporary meetup chat (handover §6). Free text, time-boxed: it exists
// for finding each other in the real world and disables at the QR scan (or,
// when rescheduling, once both agree the new time). Your messages right,
// theirs left — for both people. The safety line stays visible, and Report is
// reachable from inside the chat itself (D11).
export function MeetupChat({ plan, challengeId }: { plan: PairPlan; challengeId: string }) {
  const chatQ = useMeetupChat(plan.id, true);
  const send = useSendMeetupMessage();
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<MessageProblem | null>(null);
  const chat = chatQ.data;
  if (!chat || !chat.exists) return null;

  const onSend = async () => {
    const body = draft.trim();
    if (!body) return;
    const local = meetupMessageProblem(body);
    if (local) {
      setProblem(local);
      return;
    }
    try {
      const res: any = await send.mutateAsync({ planId: plan.id, body });
      if (res.ok) {
        setDraft('');
        setProblem(null);
      } else if (res.reason in PROBLEM_MESSAGE) setProblem(res.reason);
      else if (res.reason === 'closed') notify('This chat has closed', 'It closes once you verify, or once a new time is agreed.');
      else notify('Could not send that', 'Please try again.');
    } catch (error: any) {
      notify('Could not send that', error.message);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.thread}>
        {chat.messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}>
            <AppText style={m.mine ? styles.mineText : styles.theirsText}>{m.body}</AppText>
          </View>
        ))}
      </View>
      {chat.open ? (
        <>
          <Input
            value={draft}
            onChangeText={(t) => {
              setDraft(t);
              if (problem) setProblem(null);
            }}
            placeholder={`Message ${plan.them.first_name}`}
            maxLength={500}
            error={problem ? PROBLEM_MESSAGE[problem] : undefined}
          />
          <Button label="Send" variant="ghost" loading={send.isPending} disabled={!draft.trim()} onPress={onSend} />
        </>
      ) : (
        <AppText muted style={styles.small}>This chat has closed.</AppText>
      )}
      <AppText muted style={styles.small}>{COPY.safety}</AppText>
      <PressableScale
        onPress={() =>
          router.push({ pathname: '/modals/report', params: { mode: 'pair', id: challengeId, name: plan.them.first_name } })
        }
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel={`Report ${plan.them.first_name}`}
      >
        <AppText style={styles.report}>Report</AppText>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing(1), backgroundColor: theme.colors.surface3, borderRadius: theme.radius.md, padding: theme.spacing(1.5) },
  thread: { gap: 6 },
  bubble: { maxWidth: '80%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14 },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface, borderBottomLeftRadius: 4 },
  mineText: { color: '#FFFFFF', fontSize: 14 },
  theirsText: { color: theme.colors.text, fontSize: 14 },
  small: { fontSize: 11.5, lineHeight: 17 },
  report: { fontSize: 11, color: '#D8D2CC', textAlign: 'center', marginTop: 4 }
});
