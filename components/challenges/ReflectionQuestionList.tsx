import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
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

// One answer: the prototype's .choice.mini (app_a.html) — a full-width card
// row, 1.5px border, radius 18, left-aligned. Selected turns the border orange
// and leaves the fill alone; it is NOT a filled pill (#135). The same shape as
// Choice in app/find/form.tsx, which is where this pattern already lives.
function ChoiceRow({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo="subtle"
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[styles.choice, active && styles.choiceActive]}
    >
      <AppText style={styles.choiceLabel}>{label}</AppText>
    </PressableScale>
  );
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
            <AppText style={styles.prompt}>{question.prompt}</AppText>
            <View style={styles.choices}>
              {question.options.map((option) => (
                <ChoiceRow
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
              <ChoiceRow
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
  block: { gap: 10 },
  // .qprompt: 14/600, 1.35 line height.
  prompt: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    lineHeight: 19,
    color: theme.colors.text
  },
  // .choice.mini: padding 12/14, 8 between.
  choices: { gap: 8 },
  choice: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...theme.shadow.sm
  },
  choiceActive: { borderColor: theme.colors.primary2 },
  // .choice .t: 14/500.
  choiceLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 14,
    color: theme.colors.text
  }
});
