import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { registerToastHandler } from '@/lib/alert';
import { theme } from '@/constants/theme';

export type InAppToast = {
  title: string;
  body?: string | null;
  route?: string | null;
};

type ToastContextValue = { showToast: (t: InAppToast) => void };

const ToastContext = createContext<ToastContextValue>({ showToast: () => undefined });

export function useToast() {
  return useContext(ToastContext);
}

const VISIBLE_MS = 5000;

// The in-app counterpart to a push notification. A push banner is suppressed
// (or never delivered at all, e.g. on a simulator with no push token) while the
// app is in the foreground, so without this a partner could accept an invite
// and the person looking at the screen would see nothing announce it.
export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<InAppToast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const showToast = useCallback(
    (t: InAppToast) => {
      clear();
      setToast(t);
      timer.current = setTimeout(() => setToast(null), VISIBLE_MS);
    },
    [clear]
  );

  useEffect(() => clear, [clear]);

  // Lets lib/alert.ts reach the banner from plain (non-component) code, which
  // is where most error handling lives. Without this, notify() on web would
  // have to fall back to window.alert every time.
  useEffect(() => {
    registerToastHandler((t) => showToast({ title: t.title, body: t.body }));
    return () => registerToastHandler(null);
  }, [showToast]);

  const onPress = () => {
    const route = toast?.route;
    clear();
    setToast(null);
    if (route) router.push(route as never);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {/* A context provider renders a fragment, which gives an absolutely
          positioned child no containing block — the banner laid out with real
          height but zero width and was effectively invisible. This full-size
          View is what `left`/`right` resolve against. */}
      <View style={styles.root}>
        {children}
        {toast ? (
          <Animated.View
            entering={FadeInUp.duration(220)}
            exiting={FadeOutUp.duration(180)}
            style={[styles.wrap, { top: insets.top + theme.spacing(1) }]}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={`${toast.title}. ${toast.body ?? ''}`}
              style={styles.card}
            >
              <View style={styles.icon}>
                <Ionicons name="flame" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.text}>
                <AppText variant="caption" style={styles.title} numberOfLines={1}>
                  {toast.title}
                </AppText>
                {toast.body ? (
                  <AppText variant="caption" muted numberOfLines={2}>
                    {toast.body}
                  </AppText>
                ) : null}
              </View>
              <Pressable
                onPress={() => {
                  clear();
                  setToast(null);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
              >
                <Ionicons name="close" size={16} color={theme.colors.muted} />
              </Pressable>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  // Must fill the screen: it is the containing block for the absolute banner.
  root: { flex: 1 },
  wrap: {
    position: 'absolute',
    left: theme.spacing(1.5),
    right: theme.spacing(1.5),
    zIndex: 1000
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.25),
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1.5),
    // Sits above content, so it needs to read as a raised surface.
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg
  },
  text: { flex: 1, gap: 2 },
  title: { color: theme.colors.text, fontWeight: '700' }
});
