import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Heart } from '@/components/challenges/Heart';
import { PairAvatars } from '@/components/plans/PairAvatars';
import { COPY } from '@/features/plans/copy';
import type { PairPlan } from '@/features/plans/types';
import { theme } from '@/constants/theme';

// C3 — Choner steps in. Both halves of the heart filled, both photos.
export function StepsInIntro({
  plan,
  me,
  onContinue
}: {
  plan: PairPlan;
  me: { name: string; avatarUrl: string | null };
  onContinue: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Heart youCheckedIn partnerCheckedIn partnerState="partnered" />
      <AppText variant="title" style={styles.center}>
        {COPY.stepsInHeading}{' '}
        <AppText variant="title" style={styles.strong}>
          {COPY.stepsInHeadingStrong}
        </AppText>
      </AppText>
      <AppText muted style={styles.center}>
        {COPY.stepsInSub}
      </AppText>
      <PairAvatars me={me} them={{ name: plan.them.first_name, avatarUrl: plan.them.avatar_url }} />
      <Button label={COPY.stepsInButton} onPress={onContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'stretch', gap: theme.spacing(1.5), paddingTop: theme.spacing(2) },
  center: { textAlign: 'center' },
  strong: { color: theme.colors.primary }
});
