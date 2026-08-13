import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/input';
import {
  CUSTOM_CHOICE_KEY,
  REFLECTION_QUESTIONS,
  ReflectionDraft,
  ReflectionQuestionKey
} from '@/features/challenges/reflections';
import { theme } from '@/constants/theme';

interface Props {
  draft: ReflectionDraft;
  onChange: (next: ReflectionDraft) => void;
  // Staggered entrance on the onboarding screen; off in the edit modal, where
  // the answers are already the user's own and shouldn't animate in.
  animate?: boolean;
}

// The four "Why" questions as a single controlled block, shared by Step 2 and
// the mid-challenge edit modal so the two can never drift apart.
export function ReflectionQuestionList({ draft, onChange, animate = true }: Props) {
  const set = (key: ReflectionQuestionKey, patch: Partial<ReflectionDraft[ReflectionQuestionKey]>) =>
    onChange({ ...draft, [key]: { ...draft[key], ...patch } });

  return (
    <View style={styles.list}>
      {REFLECTION_QUESTIONS.map((question, i) => {
        const entry = draft[question.key];
        const Container = animate ? Animated.View : View;
        const animationProps = animate
          ? { entering: FadeInDown.delay(i * 90).duration(320) }
          : {};

        return (
          <Container key={question.key} style={styles.block} {...animationProps}>
            <AppText variant="subtitle">{question.prompt}</AppText>
            <View style={styles.chips}>
              {question.options.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  active={entry.choiceKey === option.key}
                  // Tapping the live choice clears it — nothing here is
                  // required, so there has to be a way back to unanswered.
                  onPress={() =>
                    set(question.key, {
                      choiceKey: entry.choiceKey === option.key ? null : option.key
                    })
                  }
                />
              ))}
              <Chip
                label="Something else"
                active={entry.choiceKey === CUSTOM_CHOICE_KEY}
                onPress={() =>
                  set(question.key, {
                    choiceKey:
                      entry.choiceKey === CUSTOM_CHOICE_KEY ? null : CUSTOM_CHOICE_KEY
                  })
                }
              />
            </View>
            {entry.choiceKey === CUSTOM_CHOICE_KEY ? (
              <Animated.View entering={FadeInDown.duration(220)}>
                <Input
                  placeholder="In your own words"
                  value={entry.customText}
                  maxLength={140}
                  multiline
                  onChangeText={(text) => set(question.key, { customText: text })}
                />
              </Animated.View>
            ) : null}
          </Container>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.spacing(3) },
  block: { gap: theme.spacing(1.5) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
});
