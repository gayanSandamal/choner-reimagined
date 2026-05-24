import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { theme } from '@/constants/theme';

interface HeroCardProps {
  title: string;
  subtitle?: string;
  progress: number;
  aiPriority?: string;
}

export function HeroCard({ title, subtitle, progress, aiPriority }: HeroCardProps) {
  return (
    <Card style={{ gap: theme.spacing(2) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: 6, flex: 1 }}>
          <AppText variant="caption" muted>Today's consistency</AppText>
          <AppText variant="title">{title}</AppText>
          {subtitle ? <AppText muted>{subtitle}</AppText> : null}
        </View>
        <ProgressRing progress={progress} label="Done" />
      </View>
      {aiPriority ? (
        <Card style={{ backgroundColor: theme.colors.surface3 }}>
          <AppText variant="label">AI Priority</AppText>
          <AppText muted>{aiPriority}</AppText>
        </Card>
      ) : null}
    </Card>
  );
}
