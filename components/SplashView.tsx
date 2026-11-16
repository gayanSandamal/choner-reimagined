import { useEffect } from 'react';
import { Image, StyleSheet, useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { BrandMark } from '@/components/auth/BrandMark';

// The JS-side splash, drawn to match the phone's own splash exactly: the "C."
// in the middle (99pt tall, the same image size as app.json's 200pt
// imageWidth), on light or dark to follow the phone's setting. The phone's
// splash can only show one centered image, so "choner." at the bottom is drawn
// here and fades in once, 0.3s after the C (decided 16 Nov 2026).
//
// It shows through font loading, session restore and the minimum splash hold,
// and can mount more than once on a cold start (the root layout, then the
// index route), so the fade plays only the first time.
const LIGHT = { bg: '#FDFCFB', word: '#001827', mark: require('../assets/brand/splash-mark-light.png') };
const DARK = { bg: '#001827', word: '#FFFFFF', mark: require('../assets/brand/splash-mark-dark.png') };
// splash-mark-*.png is 334 x 297.
const MARK_HEIGHT = 99;
const MARK_WIDTH = (MARK_HEIGHT * 334) / 297;

let wordShown = false;

export function SplashView() {
  const dark = useColorScheme() === 'dark';
  const look = dark ? DARK : LIGHT;
  const word = useSharedValue(wordShown ? 1 : 0);

  useEffect(() => {
    if (wordShown) return;
    wordShown = true;
    word.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, []);

  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value }));

  return (
    <View style={[styles.root, { backgroundColor: look.bg }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Image
        source={look.mark}
        style={{ width: MARK_WIDTH, height: MARK_HEIGHT }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Choner"
      />
      <Animated.View style={[styles.word, wordStyle]}>
        <BrandMark width={150} color={look.word} dot />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  word: { position: 'absolute', left: 0, right: 0, bottom: 56, alignItems: 'center' }
});
