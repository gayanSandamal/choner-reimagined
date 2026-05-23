import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <AppText variant="subtitle">{title}</AppText>
      {subtitle ? <AppText variant="caption" muted>{subtitle}</AppText> : null}
    </View>
  );
}
