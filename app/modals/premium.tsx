import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/StateViews';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/billing';
import { useIsPremium } from '@/features/billing/hooks';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';
import { haptics } from '@/lib/haptics';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string; body: string }[] = [
  {
    icon: 'sparkles',
    label: 'Unlimited AI coach',
    body: 'Chat anytime — your private accountability partner.'
  },
  {
    icon: 'trending-up',
    label: 'Deep insights',
    body: 'Trend analysis, momentum graphs, and weekly recaps.'
  },
  {
    icon: 'flash',
    label: 'Premium quests',
    body: 'Hand-crafted programs you won\'t find anywhere else.'
  },
  {
    icon: 'people',
    label: 'Priority matching',
    body: 'Faster, better-fitting accountability partners.'
  }
];

const SUBSCRIPTION_URLS = {
  ios: 'itms-apps://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions'
};

function ShimmerHero({ premium }: { premium: boolean }) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) }), -1, false);
    float.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [reduceMotion]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -200 + t.value * 600 }]
  }));

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 + float.value * 8 }, { scale: 1 + float.value * 0.04 }]
  }));

  return (
    <View style={styles.hero}>
      <LinearGradient
        colors={theme.gradients.paywall as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.shimmer, shimmerStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={floatStyle}>
        <Ionicons name="diamond" size={56} color="#FFF" />
      </Animated.View>
      <AppText variant="display" style={{ color: '#FFF', textAlign: 'center', marginTop: 12 }}>
        {premium ? "You're a Pro" : 'Unlock everything'}
      </AppText>
      <AppText style={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 6 }}>
        {premium ? 'Thank you for supporting Choner.' : 'Tools that turn intention into momentum.'}
      </AppText>
    </View>
  );
}

export default function PremiumModal() {
  const { isPremium, refetch } = useIsPremium();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loadingOffering, setLoadingOffering] = useState(true);
  const [busyPkg, setBusyPkg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const o = await getOfferings();
        setOffering(o);
      } catch (e) {
        // RevenueCat unavailable; graceful message below.
      } finally {
        setLoadingOffering(false);
      }
    })();
  }, []);

  const onPurchase = async (pkg: PurchasesPackage) => {
    try {
      setBusyPkg(pkg.identifier);
      await purchasePackage(pkg);
      haptics.success();
      await refetch();
      Alert.alert('Welcome to Premium!', 'Your subscription is active.');
    } catch (e: any) {
      if (!e?.userCancelled) {
        haptics.error();
        Alert.alert('Purchase failed', e.message ?? 'Please try again.');
      }
    } finally {
      setBusyPkg(null);
    }
  };

  const onRestore = async () => {
    try {
      await restorePurchases();
      await refetch();
      Alert.alert('Restored', 'Your purchases have been restored.');
    } catch (e: any) {
      Alert.alert('Restore failed', e.message ?? 'No previous purchases found.');
    }
  };

  const onManage = () => {
    const url = Platform.OS === 'ios' ? SUBSCRIPTION_URLS.ios : SUBSCRIPTION_URLS.android;
    Linking.openURL(url).catch(() =>
      Alert.alert('Could not open', 'Manage your subscription from the App Store / Play Store.')
    );
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <ScreenHeader title="Choner Premium" onClose={() => router.back()} />

        <Animated.View entering={FadeIn.duration(280)}>
          <ShimmerHero premium={isPremium} />
        </Animated.View>

        <View style={{ gap: theme.spacing(1.5), marginTop: theme.spacing(1) }}>
          {FEATURES.map((f, i) => (
            <Animated.View
              key={f.label}
              entering={FadeInDown.delay(120 + i * 80).duration(320)}
            >
              <Card style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <LinearGradient
                    colors={theme.gradients.warm as unknown as readonly [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name={f.icon} size={20} color="#FFF" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText style={{ fontFamily: theme.fonts.bodyBold }}>{f.label}</AppText>
                  <AppText muted variant="caption">
                    {f.body}
                  </AppText>
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>

        {isPremium ? (
          <View style={{ marginTop: theme.spacing(1), gap: theme.spacing(1) }}>
            <Button label="Manage subscription" variant="gradient" onPress={onManage} />
            <Button label="Restore purchases" variant="ghost" onPress={onRestore} />
          </View>
        ) : loadingOffering ? (
          <LoadingState />
        ) : !offering || offering.availablePackages.length === 0 ? (
          <Card>
            <AppText muted style={{ textAlign: 'center' }}>
              Subscriptions aren't available in this build. Please try again from a production build, or contact support.
            </AppText>
            <Button
              label="Restore purchases"
              variant="ghost"
              onPress={onRestore}
              style={{ marginTop: theme.spacing(1) }}
            />
          </Card>
        ) : (
          <View style={{ gap: theme.spacing(1) }}>
            {offering.availablePackages.map((pkg, i) => (
              <Animated.View
                key={pkg.identifier}
                entering={FadeInDown.delay(300 + i * 80).duration(320)}
              >
                <Button
                  label={
                    busyPkg === pkg.identifier
                      ? 'Processing…'
                      : `${pkg.product.title ?? 'Premium'} — ${pkg.product.priceString}`
                  }
                  variant="gradient"
                  loading={busyPkg === pkg.identifier}
                  onPress={() => onPurchase(pkg)}
                  disabled={busyPkg !== null}
                  size="lg"
                />
              </Animated.View>
            ))}
            <Button label="Restore purchases" variant="ghost" onPress={onRestore} />
            <AppText
              variant="caption"
              muted
              style={{ textAlign: 'center', marginTop: theme.spacing(1) }}
            >
              Cancel anytime in your device's subscription settings.
            </AppText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: theme.radius.xl,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
    ...theme.shadow.glow
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 220
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5)
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
