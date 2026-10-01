import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { EXERCISES, MAX_EXERCISES, toggleExercise } from '@/features/challenges/exercises';
import { theme } from '@/constants/theme';

// "Which exercises?" for a Workouts commitment. Up to four; the rest go quiet
// once four are picked. Descriptive only, so picking none is fine.
export function ExercisePicker({
  value,
  onChange
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const full = value.length >= MAX_EXERCISES;
  return (
    <View style={styles.wrap}>
      <AppText style={styles.label}>
        Which exercises? <AppText muted style={styles.note}>up to {MAX_EXERCISES}</AppText>
      </AppText>
      <View style={styles.row}>
        {EXERCISES.map((exercise) => {
          const on = value.includes(exercise);
          return (
            <View key={exercise} style={!on && full ? styles.dim : undefined}>
              <Chip
                label={exercise}
                active={on}
                size="sm"
                onPress={!on && full ? undefined : () => onChange(toggleExercise(value, exercise))}
              />
            </View>
          );
        })}
      </View>
      <AppText muted style={styles.note}>
        These show on your card. They don't change who you are matched with.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing(1) },
  label: { fontSize: 14, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  note: { fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dim: { opacity: 0.4 }
});
