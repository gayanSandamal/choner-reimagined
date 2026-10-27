import { ReactNode, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
  KeyboardStickyView
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

// Space kept between the focused field and whatever covers the bottom of the
// screen: the keyboard, or a footer riding on top of it.
export const KEYBOARD_GAP = 24;

// A scrolling form that keeps the focused field above the keyboard, on both
// platforms. React Native's own KeyboardAvoidingView can't do this on Android
// any more: Expo SDK 57 draws edge to edge, so the window no longer shrinks for
// the keyboard and the last fields of a form end up underneath it.
export function KeyboardScroll({ children, ...props }: KeyboardAwareScrollViewProps) {
  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" bottomOffset={KEYBOARD_GAP} {...props}>
      {children}
    </KeyboardAwareScrollView>
  );
}

// The same, with a footer (Continue, Save) pinned under the form. The footer
// rides up on the keyboard so its button stays reachable, and the focused
// field is kept clear of the footer as well as the keyboard.
export function KeyboardFooterScroll({
  footer,
  footerStyle,
  children,
  ...props
}: KeyboardAwareScrollViewProps & { footer: ReactNode; footerStyle?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);

  return (
    <>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={footerHeight + KEYBOARD_GAP}
        {...props}
      >
        {children}
      </KeyboardAwareScrollView>
      {/* The screen already pads the bottom safe area. With the keyboard up
          that padding would show as a gap between the footer and the keyboard,
          so the footer drops by the same amount. */}
      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View
          style={[styles.footer, footerStyle]}
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        >
          {footer}
        </View>
      </KeyboardStickyView>
    </>
  );
}

const styles = StyleSheet.create({
  // Opaque, because once it rides up it sits over the form.
  footer: { backgroundColor: theme.colors.bg }
});
