import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { ChallengeTaskItem } from '@/components/challenges/ChallengeTaskItem';
import { theme } from '@/constants/theme';

interface Task {
  key: string;
  title: string;
  meta: string;
}

const challengeTitles: Record<string, string> = {
  '1': '7-Day Energy Reset',
  '2': 'Sleep Reset Sprint',
  '3': 'Stress Recovery Week',
  '4': 'Hydration Catalyst',
  '5': 'Weekend Buffer Plan',
};

const challengeDescriptions: Record<string, string> = {
  '1': 'Best for busy professionals rebuilding consistency and physical vitality.',
  '2': 'Short challenge for better sleep timing, evening routines, and recovery.',
  '3': 'Reduce mental load with lighter daily tasks and mindfulness targets.',
  '4': 'Focus on building the foundational habit of drinking enough water daily.',
  '5': 'Avoid the typical weekend drop-off and protect your streak with light goals.',
};

const challengeTasks: Record<string, Task[]> = {
  '1': [
    { key: 'walk', title: 'Walk 7,000 steps', meta: 'Daily movement target' },
    { key: 'sunlight', title: '10 min morning sunlight', meta: 'Circadian rhythm lock' },
    { key: 'caffeine', title: 'No caffeine after 2 PM', meta: 'Protect deep sleep' },
  ],
  '2': [
    { key: 'screen', title: 'Digital wind-down', meta: 'No screens 30 mins before sleep' },
    { key: 'lights', title: 'Dim household lights', meta: 'Prepare melatonin release' },
    { key: 'wake', title: 'Consistent wake window', meta: 'Set alarm for same time daily' },
  ],
  '3': [
    { key: 'hydrate', title: 'Hydrate consistently', meta: '2.5L water throughout the day' },
    { key: 'breathe', title: '5 min boxed breathing', meta: 'Soothe sympathetic nervous system' },
    { key: 'nature', title: '15 min nature stroll', meta: 'Unplugged recovery walking' },
  ],
  'default': [
    { key: 'walk', title: 'Walk 7,000 steps', meta: 'Daily movement target' },
    { key: 'hydrate', title: 'Hydrate consistently', meta: '2.5L over the day' },
    { key: 'winddown', title: 'Digital wind-down', meta: '30 mins before sleep' },
  ],
};

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challengeTitle = challengeTitles[id] || `Challenge #${id}`;
  const challengeDesc = challengeDescriptions[id] || 'Designed for users who need structure, social pressure, and an achievable streak.';
  const tasks = challengeTasks[id] || challengeTasks['default'];

  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  // Reset completion state when id changes
  useEffect(() => {
    setCompletedMap({});
  }, [id]);

  const toggleTask = (key: string) => {
    setCompletedMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <ScreenHeader title={challengeTitle} onBack={() => router.back()} />
        
        <Card style={{ marginTop: theme.spacing(1) }}>
          <AppText muted>{challengeDesc}</AppText>
        </Card>
        
        <View style={{ marginTop: theme.spacing(2), marginBottom: theme.spacing(1) }}>
          <AppText variant="label" muted style={{ paddingLeft: theme.spacing(1) }}>Tasks</AppText>
        </View>

        {tasks.map(task => (
          <ChallengeTaskItem 
            key={task.key}
            title={task.title}
            meta={task.meta}
            completed={!!completedMap[task.key]}
            onPress={() => toggleTask(task.key)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}
