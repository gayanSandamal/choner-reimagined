import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { theme } from '@/constants/theme';

export function InviteCard({ onPress }: { onPress?: () => void }) {
  return (
    <PressableScale onPress={onPress} haptic="light" scaleTo="subtle" style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name="person-add-outline" size={19} color={theme.colors.primary2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontFamily: theme.fonts.bodyBold }}>Invite a friend</AppText>
        <AppText variant="caption" muted>Start a private fire with someone who keeps you honest</AppText>
      </View>
      <Ionicons name="arrow-forward" size={18} color={theme.colors.primary2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: theme.spacing(1.75),
    ...theme.shadow.glow
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,138,31,0.16)',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
