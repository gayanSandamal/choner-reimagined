import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { activityIcon } from '@/components/home/activityIcons';
import { PairSafetyMenu } from '@/components/safety/PairSafetyMenu';
import { pairedFor } from '@/features/safety/rules';
import { theme } from '@/constants/theme';

// Matched: the resting state, what someone opens Find to see for weeks.
//
// Drawn in the same style as searching and Match found (#196, decided 10 Nov
// 2026), so Find reads as one place from the first search to the partnership:
// the activity row, the radar (still now, with both faces in it), "Paired with
// Gayan", then See Gayan's profile, Already on the move as an outline, and End
// this match last and quiet.
//
// Every way OUT of a match lives here and nowhere else: End this match (the
// neutral one), and Report and Block behind the "···". Challenges owns the
// challenge; Find owns the partner. No "Invite someone else": you cannot
// invite anyone while you have a partner.
const RADAR = 210;

export function MatchedCard({
  myName,
  myAvatarUrl,
  partnerName,
  partnerAvatarUrl,
  pairedOn,
  activityKey = null,
  since,
  challengeId
}: {
  myName: string | null;
  myAvatarUrl: string | null;
  partnerName: string;
  partnerAvatarUrl: string | null;
  pairedOn: string | null;
  activityKey?: string | null;
  since: string | null;
  // One of my challenges that names this partner. Null only if none ever did,
  // in which case report and block have nothing to file against.
  challengeId: string | null;
}) {
  const howLong = pairedFor(since);
  // Profile first (#203, decided 13 Nov 2026): Find is about your partner, so
  // the faces and the main button open their profile. The plan lives on
  // Challenges, one tap away in the tab bar and at the foot of the profile.
  const openProfile = () => router.push('/find/partner' as never);

  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      {pairedOn ? (
        <View style={styles.actRow}>
          <LinearGradient
            colors={theme.gradients.warm as unknown as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actIcon}
          >
            <Icon name={activityIcon(activityKey) ?? 'target'} size={22} color="#FFFFFF" strokeWidth={1.8} />
          </LinearGradient>
          <View style={styles.actText}>
            <AppText style={styles.actTitle}>{pairedOn}</AppText>
            <AppText style={styles.actSub}>Your shared activity with {partnerName}</AppText>
          </View>
          <Icon name="lock" size={16} color={theme.colors.dim} strokeWidth={2} />
        </View>
      ) : null}

      <View>
        {challengeId ? (
          <View style={styles.menu}>
            <PairSafetyMenu userChallengeId={challengeId} partnerFirstName={partnerName} tone="ink" />
          </View>
        ) : null}
        <PressableScale
          onPress={openProfile}
          scaleTo="subtle"
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel={`You and ${partnerName}, paired. See ${partnerName}'s profile.`}
          style={styles.radar}
        >
          {/* Still, not pulsing: the search is over. */}
          <View pointerEvents="none" style={[styles.ring, styles.ring1]} />
          <View pointerEvents="none" style={[styles.ring, styles.ring2]} />
          <View pointerEvents="none" style={[styles.ring, styles.ring3]} />
          <View style={styles.faces}>
            <Avatar uri={myAvatarUrl} name={myName ?? 'You'} size={66} ring self />
            <View style={styles.overlap}>
              <Avatar uri={partnerAvatarUrl} name={partnerName} size={66} ring />
            </View>
            <View style={styles.tick}>
              <Ionicons name="checkmark" size={15} color="#FFFFFF" />
            </View>
          </View>
        </PressableScale>
      </View>

      <View style={styles.title}>
        <AppText style={styles.titleText}>Paired with {partnerName}</AppText>
        {pairedOn || howLong ? (
          <AppText style={styles.meta}>
            {[pairedOn ? `${pairedOn} together` : null, howLong].filter(Boolean).join(' · ')}
          </AppText>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button label={`See ${partnerName}'s profile`} onPress={openProfile} />
        {/* Second, so an outline (decided 10 Nov 2026): two solid orange
            buttons stacked compete, and your challenge is the thing to do. */}
        <Button
          label="Already on the move"
          variant="outline"
          leftIcon={<Icon name="community" size={18} color={theme.colors.primary} strokeWidth={2} />}
          onPress={() => router.push('/find/who-else')}
        />
        {/* Last and quiet: there, never inviting. It still asks first. */}
        <PressableScale
          haptic="selection"
          hitSlop={8}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/modals/end-match',
              params: { name: partnerName, ...(challengeId ? { id: challengeId } : {}) }
            } as never)
          }
          style={styles.endWrap}
        >
          <AppText style={styles.end}>End this match</AppText>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // The same row as ActivityRow on the Find tab (the prototype's .ccard2).
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    ...theme.shadow.sm
  },
  actIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actText: { flex: 1, minWidth: 0 },
  actTitle: { fontFamily: theme.fonts.bodyMedium, fontSize: 15, color: theme.colors.text },
  actSub: { fontFamily: theme.fonts.bodyRegular, fontSize: 12.5, lineHeight: 17, color: theme.colors.muted, marginTop: 3 },
  menu: { position: 'absolute', top: 4, right: 0, zIndex: 2 },
  radar: {
    width: RADAR,
    height: RADAR,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  ring: { position: 'absolute', borderRadius: RADAR / 2, borderWidth: 1.5 },
  ring1: { width: RADAR, height: RADAR, borderColor: 'rgba(253,131,2,0.18)' },
  ring2: { width: RADAR - 48, height: RADAR - 48, borderColor: 'rgba(253,131,2,0.28)' },
  ring3: {
    width: RADAR - 96,
    height: RADAR - 96,
    borderColor: 'rgba(253,131,2,0.42)',
    backgroundColor: 'rgba(253,131,2,0.06)'
  },
  faces: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  overlap: { marginLeft: -14 },
  tick: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.bg,
    zIndex: 3
  },
  title: { alignItems: 'center', marginTop: 4, marginBottom: 14, gap: 2 },
  titleText: { fontSize: 19, color: theme.colors.primary2, fontFamily: theme.fonts.bodyBold, textAlign: 'center' },
  meta: { fontSize: 12.5, color: theme.colors.muted, textAlign: 'center' },
  actions: { gap: theme.spacing(1.25) },
  endWrap: { alignSelf: 'center', paddingVertical: 8 },
  end: { fontSize: 13.5, color: theme.colors.muted, fontFamily: theme.fonts.bodyMedium }
});
