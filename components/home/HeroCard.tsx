import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { theme } from '@/constants/theme';

export function HeroCard() {
  return (
    <Card style={{ gap: theme.spacing(2) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: 6, flex: 1 }}>
          <AppText variant="caption" muted>Today’s consistency</AppText>
          <AppText variant="title">Energy Reset</AppText>
          <AppText muted>Day 3 of 7 • Momentum is building</AppText>
        </View>
        <ProgressRing progress={78} label="Energy" />
      </View>
      <Card style={{ backgroundColor: theme.colors.surface3 }}>
        <AppText variant="label">AI Priority</AppText>
        <AppText muted>Recovery is slightly low today. Focus on movement + hydration.</AppText>
      </Card>
    </Card>
  );
}
