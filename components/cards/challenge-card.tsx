import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/text';
import { theme } from '@/constants/theme';

interface ChallengeCardProps {
  title: string;
  summary: string;
  category: string;
  duration: number;
  onPress?: () => void;
}

export function ChallengeCard({ title, summary, category, duration, onPress }: ChallengeCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText variant="caption">{duration}d</AppText>
      </View>
      <AppText variant="muted">{category}</AppText>
      <AppText>{summary}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
