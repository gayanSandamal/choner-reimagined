import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/Chip';
import { COPY, OPENER, REPLIES } from '@/features/plans/copy';
import { useSendPairMessage } from '@/features/plans/hooks';
import type { PairPlan } from '@/features/plans/types';
import { notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

const TEXT: Record<string, string> = { opener: OPENER, ...REPLIES };

// C2 — Say hi. Structured, never free text. Bubble side comes from `mine`,
// which the server computes from whoever is looking: your own message is on
// the right and theirs on the left, for BOTH people. (The prototype had this
// hardcoded to one person — handover §3.2's bug.)
export function SayHiStep({ plan }: { plan: PairPlan }) {
  const send = useSendPairMessage();
  const hasOpener = plan.messages.some((m) => m.key === 'opener');
  const iReplied = plan.messages.some((m) => m.mine && m.key !== 'opener');

  const onSend = async (key: string) => {
    try {
      const res: any = await send.mutateAsync({ planId: plan.id, key });
      if (!res.ok && res.reason !== 'already_sent') notify('Could not send that', 'Please try again.');
    } catch (error: any) {
      notify('Could not send that', error.message);
    }
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="title">{COPY.sayHiHeading}</AppText>
      <AppText muted>{COPY.sayHiSub}</AppText>

      <View style={styles.thread}>
        {plan.messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}>
            <AppText style={m.mine ? styles.mineText : styles.theirsText}>{TEXT[m.key]}</AppText>
          </View>
        ))}
      </View>

      {plan.i_open && !hasOpener ? (
        <Button label={OPENER} loading={send.isPending} onPress={() => onSend('opener')} />
      ) : null}

      {!plan.i_open && hasOpener && !iReplied ? (
        <View style={styles.replies}>
          {(Object.keys(REPLIES) as (keyof typeof REPLIES)[]).map((k) => (
            <Chip key={k} label={REPLIES[k]} onPress={send.isPending ? undefined : () => onSend(k)} />
          ))}
        </View>
      ) : null}

      <AppText muted style={styles.safety}>{COPY.safety}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing(1.5) },
  thread: { gap: 8, marginVertical: theme.spacing(2) },
  bubble: { maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16 },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface3, borderBottomLeftRadius: 4 },
  mineText: { color: '#FFFFFF', fontSize: 14 },
  theirsText: { color: theme.colors.text, fontSize: 14 },
  replies: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safety: { fontSize: 11.5, lineHeight: 17, marginTop: theme.spacing(2) }
});
