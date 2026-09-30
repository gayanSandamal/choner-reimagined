import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { BrandMark } from '@/components/auth/BrandMark';
import { theme } from '@/constants/theme';

// Shared pieces of the sign-in / sign-up layout from the prototype: a light
// headline with a bold tail, a muted sub line, small field labels, and the
// "switch to the other screen" line under the button.

export function AuthHeading({
  lead,
  emphasis,
  sub
}: {
  lead: string;
  emphasis: string;
  // Optional: Sign up says everything it needs to in the heading, so a sub
  // line there would only be filler.
  sub?: string;
}) {
  return (
    <View style={[styles.heading, !sub && styles.headingNoSub]}>
      <AppText style={styles.h1}>
        {lead}
        <AppText style={[styles.h1, styles.h1Bold]}>{emphasis}</AppText>
      </AppText>
      {sub ? <AppText style={styles.sub}>{sub}</AppText> : null}
    </View>
  );
}

// Verify email, Forgot password and Set new password all open the same way:
// the mark, one light 24pt line in sentence case, then a muted explanation.
// They were the three screens left on the old uppercase display heading.
export function AuthCenteredHeader({
  title,
  helper
}: {
  title: string;
  helper: React.ReactNode;
}) {
  return (
    <View style={styles.centeredHeader}>
      <BrandMark width={150} />
      <AppText style={styles.centeredTitle}>{title}</AppText>
      <AppText variant="caption" muted style={styles.centeredHelper}>
        {helper}
      </AppText>
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <AppText style={styles.fieldLabel}>{children}</AppText>;
}

export function AuthSwitchLink({
  prompt,
  action,
  onPress
}: {
  prompt: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Pressable hitSlop={8} onPress={onPress} accessibilityRole="link" style={styles.switchWrap}>
      <AppText style={styles.switchText}>
        {prompt} <AppText style={styles.switchAction}>{action}</AppText>
      </AppText>
    </Pressable>
  );
}

// Field box per the prototype: 16pt radius, hairline border, soft shadow.
export const authInputBox = {
  borderRadius: 16,
  ...theme.shadow.sm
} as const;

const styles = StyleSheet.create({
  heading: { gap: 8, marginBottom: 8 },
  headingNoSub: { marginBottom: 20 },
  centeredHeader: { alignItems: 'center', gap: 10, marginBottom: 10 },
  centeredTitle: {
    fontFamily: theme.fonts.display,
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: theme.colors.text,
    textAlign: 'center'
  },
  centeredHelper: { textAlign: 'center', fontSize: 13, lineHeight: 20 },
  h1: {
    fontFamily: theme.fonts.display,
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: theme.colors.text
  },
  h1Bold: { fontFamily: theme.fonts.bodyBold },
  sub: { fontFamily: theme.fonts.body, fontSize: 13.5, lineHeight: 21, color: theme.colors.muted },
  fieldLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 12.5,
    color: theme.colors.text,
    marginBottom: -2
  },
  switchWrap: { alignSelf: 'center', marginTop: 14 },
  switchText: { fontFamily: theme.fonts.body, fontSize: 12, color: theme.colors.muted, textAlign: 'center' },
  switchAction: { fontFamily: theme.fonts.bodyMedium, color: theme.colors.link }
});
