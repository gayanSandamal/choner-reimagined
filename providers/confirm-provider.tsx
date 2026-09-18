import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { registerConfirmHandler, type ConfirmOptions } from '@/lib/alert';
import { theme } from '@/constants/theme';

// The in-app counterpart to Alert.alert's yes/no, for web.
//
// window.confirm looked like a reasonable fallback but is suppressed outright
// in embedded webviews and sandboxed iframes — it returns false in about a
// millisecond without ever drawing a dialog. Every confirm on web was
// therefore answering "no" on the user's behalf, which reads as a dead button.
//
// Registered the same way as the toast handler so plain async functions can
// call confirmAction() without being components.
export function ConfirmProvider({ children }: PropsWithChildren) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const ask = useCallback((options: ConfirmOptions) => {
    // A second ask while one is open would strand the first promise, so
    // answer it "no" before taking over.
    resolver.current?.(false);
    setPending(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    registerConfirmHandler(ask);
    return () => registerConfirmHandler(null);
  }, [ask]);

  const answer = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setPending(null);
  };

  return (
    <>
      {children}
      {pending ? (
        <Animated.View entering={FadeIn.duration(160)} style={styles.scrim}>
          <Animated.View entering={FadeInDown.delay(40).duration(200)} style={styles.card}>
            <AppText variant="subtitle">{pending.title}</AppText>
            {pending.message ? (
              <AppText variant="caption" muted style={styles.message}>
                {pending.message}
              </AppText>
            ) : null}
            <View style={styles.actions}>
              <Button
                label={pending.confirmLabel ?? 'OK'}
                variant={pending.destructive ? 'danger' : 'primary'}
                onPress={() => answer(true)}
              />
              <Button
                label={pending.cancelLabel ?? 'Cancel'}
                variant="ghost"
                onPress={() => answer(false)}
              />
            </View>
          </Animated.View>
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlayDim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(3),
    // Above the check-in and starting-point sheets, which sit at 2000 — a
    // confirm raised from one of those has to draw on top of it.
    zIndex: 3000
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2.5),
    gap: theme.spacing(1),
    ...theme.shadow.lg
  },
  message: { lineHeight: 19 },
  actions: { marginTop: theme.spacing(1), gap: theme.spacing(0.5) }
});
