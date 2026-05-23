import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/text';
import { theme } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <View style={styles.card}>
      <AppText variant="muted">{label}</AppText>
      <AppText style={styles.value}>{value}</AppText>
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flex: 1,
  },
  value: { fontSize: 24, fontWeight: '700' },
});
