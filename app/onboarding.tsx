import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/providers/session-provider';
import { updateProfile } from '@/features/profile/api';
import { theme } from '@/constants/theme';

const goals = ['Move more', 'Sleep better', 'Reduce stress', 'Improve energy'];
const struggles = ['I start but stop', 'I lack accountability', 'I am too busy', 'I feel overwhelmed'];
const stylesList = ['solo', 'partner', 'group', 'public'];
const stressLevels = ['low', 'medium', 'high'];

export default function OnboardingScreen() {
  const { session } = useSession();
  const [goal, setGoal] = useState(goals[0]);
  const [struggle, setStruggle] = useState(struggles[0]);
  const [style, setStyle] = useState(stylesList[1]);
  const [stress, setStress] = useState(stressLevels[1]);

  const mutation = useMutation({
    mutationFn: () => updateProfile(session!.user.id, {
      primary_goal: goal,
      main_struggle: struggle,
      accountability_mode: style,
      stress_level: stress,
      onboarding_complete: true,
    }),
    onSuccess: () => router.replace('/(tabs)/home'),
    onError: (error: any) => Alert.alert('Could not finish onboarding', error.message),
  });

  return (
    <Screen>
      <AppText variant="title">Set up your first challenge</AppText>
      <AppText variant="muted">Tell Choner what matters most so your challenge and accountability flow feel personal from day one.</AppText>
      <SelectionBlock title="Primary goal" options={goals} selected={goal} onSelect={setGoal} />
      <SelectionBlock title="Main struggle" options={struggles} selected={struggle} onSelect={setStruggle} />
      <SelectionBlock title="Current stress level" options={stressLevels} selected={stress} onSelect={setStress} />
      <SelectionBlock title="Motivation style" options={stylesList} selected={style} onSelect={setStyle} />
      <Button label={mutation.isPending ? 'Saving...' : 'Finish setup'} onPress={() => mutation.mutate()} disabled={mutation.isPending} />
    </Screen>
  );
}

function SelectionBlock({ title, options, selected, onSelect }: { title: string; options: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="subtitle">{title}</AppText>
      <View style={styles.grid}>
        {options.map((option) => (
          <Pressable key={option} onPress={() => onSelect(option)} style={[styles.item, selected === option && styles.itemActive]}>
            <AppText>{option}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemActive: { borderColor: theme.colors.primary2, backgroundColor: theme.colors.surface2 },
});
