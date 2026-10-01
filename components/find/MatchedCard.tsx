import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { PairSafetyMenu } from '@/components/safety/PairSafetyMenu';
import { pairedFor } from '@/features/safety/rules';
import { theme } from '@/constants/theme';

// Matched — the resting state. This is what someone opens Find to see for
// weeks, so it carries weight rather than being a row: both faces with a green
// tick between them, who, what they are paired ON, and for how long.
//
// Every way OUT of a match lives here and nowhere else: End this match (the
// neutral one), and Report and Block behind the "···". Challenges owns the
// challenge; Find owns the partner.
export function MatchedCard({
  myName,
  myAvatarUrl,
  partnerName,
  partnerAvatarUrl,
  pairedOn,
  since,
  challengeId
}: {
  myName: string | null;
  myAvatarUrl: string | null;
  partnerName: string;
  partnerAvatarUrl: string | null;
  pairedOn: string | null;
  since: string | null;
  // One of my challenges that names this partner. Null only if none ever did,
  // in which case report and block have nothing to file against.
  challengeId: string | null;
}) {
  const howLong = pairedFor(since);
  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      <View style={styles.matched}>
        {challengeId ? (
          <View style={styles.matchedMenu}>
            <PairSafetyMenu userChallengeId={challengeId} partnerFirstName={partnerName} tone="ink" />
          </View>
        ) : null}

        <View style={styles.faces} accessible accessibilityLabel={`You and ${partnerName}, matched`}>
          <Avatar uri={myAvatarUrl} name={myName ?? 'You'} size={76} ring />
          <View style={styles.tick}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
          <Avatar uri={partnerAvatarUrl} name={partnerName} size={76} ring />
        </View>

        <AppText style={styles.pairedTitle}>You and {partnerName}</AppText>
        {pairedOn || howLong ? (
          <AppText style={styles.matchedMeta}>
            {[pairedOn ? `Paired on ${pairedOn}` : null, howLong].filter(Boolean).join(' · ')}
          </AppText>
        ) : null}

        <Button label="See your challenge" onPress={() => router.push('/(tabs)/challenges')} />
        <Button
          label="End this match"
          variant="ghost"
          onPress={() =>
            router.push({
              pathname: '/modals/end-match',
              params: { name: partnerName, ...(challengeId ? { id: challengeId } : {}) }
            } as never)
          }
        />
      </View>

      {/* Social proof, never a candidate list: one partner at a time. */}
      <Button label="Already on the move" variant="ghost" onPress={() => router.push('/find/who-else')} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  matched: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 22,
    alignItems: 'stretch',
    gap: 10,
    marginBottom: theme.spacing(2)
  },
  matchedMenu: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  faces: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  tick: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -8,
    zIndex: 1,
    borderWidth: 2,
    borderColor: theme.colors.surface
  },
  matchedMeta: { fontSize: 13, color: theme.colors.muted, textAlign: 'center', marginBottom: 6 },
  pairedTitle: { color: theme.colors.text, fontSize: 20, textAlign: 'center', marginTop: 8 }
});
