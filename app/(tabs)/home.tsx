import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HeroCard } from '@/components/home/HeroCard';
import { ChallengeTaskItem } from '@/components/challenges/ChallengeTaskItem';
import { theme } from '@/constants/theme';

export default function HomeScreen() {
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    walk: false,
    water: false,
    sleep: false,
  });

  const toggleTask = (key: string) => {
    setCompletedTasks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <View style={{ gap: 6 }}>
          <AppText variant="caption" muted>Good evening</AppText>
          <AppText variant="title">Your momentum looks strong</AppText>
        </View>

        <HeroCard />

        <SectionHeader title="Today’s tasks" subtitle="The minimum actions that keep your streak alive" />
        <ChallengeTaskItem 
          title="Walk 7,000 steps" 
          meta="Movement • estimated 35 mins" 
          completed={completedTasks.walk}
          onPress={() => toggleTask('walk')}
        />
        <ChallengeTaskItem 
          title="Drink 2.5L water" 
          meta="Recovery • all day target" 
          completed={completedTasks.water}
          onPress={() => toggleTask('water')}
        />
        <ChallengeTaskItem 
          title="Sleep before 11:30 PM" 
          meta="Sleep • protect tomorrow’s energy" 
          completed={completedTasks.sleep}
          onPress={() => toggleTask('sleep')}
        />

        <Card>
          <AppText variant="label">Quick actions</AppText>
          <View style={{ gap: theme.spacing(1), marginTop: theme.spacing(1) }}>
            <AppText onPress={() => router.push('/modals/ai-coach')}>• Open AI coach</AppText>
            <AppText onPress={() => router.push('/modals/notifications')}>• Review notifications</AppText>
            <AppText onPress={() => router.push('/modals/premium')}>• See premium plan</AppText>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
