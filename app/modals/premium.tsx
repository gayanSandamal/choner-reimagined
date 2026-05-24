import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

const FEATURES = [
  'Unlimited AI coach conversations',
  'Advanced insights and trend analysis',
  'Premium challenges and accountability templates',
  'Priority partner matching',
];

const SUBSCRIPTION_URLS = {
  ios: 'itms-apps://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
};

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
        // RevenueCat unavailable; we'll show a graceful message below.
      } finally {
        setLoadingOffering(false);
      }
    })();
  }, []);

  const onPurchase = async (pkg: PurchasesPackage) => {
    try {
      setBusyPkg(pkg.identifier);
      await purchasePackage(pkg);
      await refetch();
      Alert.alert('Welcome to Premium!', 'Your subscription is active.');
    } catch (e: any) {
      if (!e?.userCancelled) {
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

        <Card variant="glow" style={{ marginTop: theme.spacing(2), alignItems: 'center', paddingVertical: theme.spacing(4) }}>
          <Ionicons name="diamond" size={48} color={theme.colors.primary} style={{ marginBottom: theme.spacing(2) }} />
          <AppText variant="title" style={{ textAlign: 'center', marginBottom: theme.spacing(1) }}>
            {isPremium ? "You're a Pro" : 'Unlock everything'}
          </AppText>
          <AppText muted style={{ textAlign: 'center' }}>
            {isPremium ? 'Thank you for supporting Choner.' : 'Reach your peak potential with the full toolkit.'}
          </AppText>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
            <AppText variant="label">Premium features</AppText>
          </View>
          {FEATURES.map((f) => (
            <View key={f} style={{ flexDirection: 'row', gap: 8, marginVertical: 4 }}>
              <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
              <AppText muted>{f}</AppText>
            </View>
          ))}
        </Card>

        {isPremium ? (
          <View style={{ marginTop: theme.spacing(1), gap: theme.spacing(1) }}>
            <Button label="Manage subscription" onPress={onManage} />
            <Button label="Restore purchases" variant="ghost" onPress={onRestore} />
          </View>
        ) : loadingOffering ? (
          <LoadingState />
        ) : !offering || offering.availablePackages.length === 0 ? (
          <Card>
            <AppText muted style={{ textAlign: 'center' }}>
              Subscriptions aren't available in this build. Please try again from a production build, or contact support.
            </AppText>
            <Button label="Restore purchases" variant="ghost" onPress={onRestore} style={{ marginTop: theme.spacing(1) }} />
          </Card>
        ) : (
          <View style={{ gap: theme.spacing(1) }}>
            {offering.availablePackages.map((pkg) => (
              <Button
                key={pkg.identifier}
                label={
                  busyPkg === pkg.identifier
                    ? 'Processing...'
                    : `${pkg.product.title ?? 'Premium'} — ${pkg.product.priceString}`
                }
                onPress={() => onPurchase(pkg)}
                disabled={busyPkg !== null}
              />
            ))}
            <Button label="Restore purchases" variant="ghost" onPress={onRestore} />
            <AppText variant="caption" muted style={{ textAlign: 'center', marginTop: theme.spacing(1) }}>
              Cancel anytime in your device's subscription settings.
            </AppText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
