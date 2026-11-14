import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TopBarPill, useTopBarClearance } from '@/components/navigation/AppTopBar';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/StateViews';
import { PressableScale } from '@/components/ui/PressableScale';
import { PairSafetyMenu } from '@/components/safety/PairSafetyMenu';
import { useMyPartner } from '@/features/challenges/hooks';
import { partnerWhy } from '@/features/challenges/reflections';
import { pairedFor } from '@/features/safety/rules';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';

// Your partner's profile, opened from the paired Find screen (#203, decided
// 13 Nov 2026). Only a confirmed partner ever reaches it: a match offer or a
// stranger never does.
//
// Photo, first name, photo confirmed, the activity, the areas they picked,
// how long you have been paired, sessions together, and their Why answers.
// No age, gender or contact details, and no way to message: the plan and the
// meet-up chat live on Challenges, which is the one button here.
export default function PartnerProfileScreen() {
  const { session } = useSession();
  const clearance = useTopBarClearance();
  const partnerQ = useMyPartner(session?.user.id);
  const partner = partnerQ.data?.partnered ? partnerQ.data : null;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/find'));

  if (!partner) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
        <TopBarPill title="" left={<BackButton onPress={back} />} />
        {partnerQ.isLoading ? <LoadingState /> : (
          <View style={[styles.gone, { paddingTop: clearance }]}>
            <AppText muted style={styles.center}>You don't have a partner right now.</AppText>
            <Button label="Back to Find" variant="ghost" onPress={back} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const name = partner.first_name;
  const why = partnerWhy(partner.why);
  const howLong = pairedFor(partner.since);
  const rows: [string, string][] = [
    ...(partner.paired_on ? [['Activity', partner.paired_on] as [string, string]] : []),
    ...(partner.area ? [['Area', partner.area] as [string, string]] : []),
    ...(howLong ? [['Paired', howLong.charAt(0).toUpperCase() + howLong.slice(1)] as [string, string]] : []),
    ['Sessions together', String(partner.sessions_together ?? 0)]
  ];

  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <TopBarPill
        title={name}
        left={<BackButton onPress={back} />}
        right={
          partner.my_challenge_id ? (
            <PairSafetyMenu userChallengeId={partner.my_challenge_id} partnerFirstName={name} tone="onNavy" />
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: clearance + 8 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View>
            <Avatar uri={partner.avatar_url} name={name} size={112} ring />
          </View>
          <AppText style={styles.name}>{name}</AppText>
          {partner.photo_confirmed ? (
            <View style={styles.confirmed}>
              <Ionicons name="checkmark" size={14} color={theme.colors.success} />
              <AppText style={styles.confirmedText}>Photo confirmed</AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          {rows.map(([k, v], i) => (
            <View key={k} style={[styles.row, i > 0 && styles.rowLine]}>
              <AppText style={styles.rowKey}>{k}</AppText>
              <AppText style={styles.rowValue}>{v}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <AppText style={styles.eyebrow}>WHY {name.toUpperCase()} IS DOING THIS</AppText>
          {why.length ? (
            why.map((w) => (
              <View key={w.question} style={styles.why}>
                <AppText style={styles.question}>{w.question}</AppText>
                <AppText style={styles.answer}>{w.answer}</AppText>
              </View>
            ))
          ) : (
            <AppText style={styles.none}>{name} has not answered these yet.</AppText>
          )}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="See your challenge" onPress={() => router.push('/(tabs)/challenges')} />
      </View>
    </SafeAreaView>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back to Find">
      <Ionicons name="chevron-back" size={20} color={theme.colors.onNavy} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 22, paddingBottom: 24, gap: 14 },
  gone: { padding: 22, gap: 12, alignItems: 'center' },
  center: { textAlign: 'center' },
  head: { alignItems: 'center', gap: 6 },
  name: { fontSize: 24, lineHeight: 30, color: theme.colors.primary2, fontFamily: theme.fonts.bodyBold, marginTop: 6 },
  confirmed: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confirmedText: { fontSize: 12.5, color: theme.colors.success, fontFamily: theme.fonts.bodyMedium },
  card: { backgroundColor: theme.colors.surface, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, ...theme.shadow.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowLine: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  rowKey: { fontSize: 13, color: theme.colors.muted },
  rowValue: { flexShrink: 1, textAlign: 'right', fontSize: 13, color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  eyebrow: { fontSize: 10.5, letterSpacing: 1, color: theme.colors.muted, paddingTop: 8, paddingBottom: 4 },
  why: { paddingVertical: 6 },
  question: { fontSize: 11.5, color: theme.colors.muted },
  answer: { fontSize: 13.5, lineHeight: 19, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium, marginTop: 1 },
  none: { fontSize: 13, color: theme.colors.muted, paddingVertical: 8 },
  footer: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 12 }
});
