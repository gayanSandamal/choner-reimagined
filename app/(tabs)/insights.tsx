import { ScrollView, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

export default function InsightsScreen() {
  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <SectionHeader title="Insights" subtitle="Where your consistency is strong and where it drops" />
        <View style={{ gap: theme.spacing(2) }}>
          <Card>
            <AppText variant="label">Consistency score</AppText>
            <AppText variant="title">82</AppText>
            <AppText muted>Morning tasks perform 34% better for you than evening tasks.</AppText>
          </Card>
          <Card>
            <AppText variant="label">Drop-off pattern</AppText>
            <AppText muted>Your highest risk window is late Sunday. AI suggests a lighter weekend mode.</AppText>
          </Card>
          <Card>
            <AppText variant="label">Accountability effect</AppText>
            <AppText muted>You complete 28% more tasks when a partner can see your check-ins.</AppText>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
