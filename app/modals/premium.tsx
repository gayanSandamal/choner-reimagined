import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { theme } from '@/constants/theme';

export default function PremiumModal() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = () => {
    Alert.alert(
      "Confirm Purchase",
      "Do you want to subscribe to Choner Premium for $9.99/month?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Subscribe", 
          onPress: () => {
            setIsSubscribed(true);
            Alert.alert("Welcome to Premium!", "You have unlocked all Choner Premium features!");
          }
        }
      ]
    );
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <ScreenHeader title="Choner Premium" onClose={() => router.back()} />
        
        <Card variant="glow" style={{ marginTop: theme.spacing(2), alignItems: 'center', paddingVertical: theme.spacing(4) }}>
          <Ionicons name="diamond" size={48} color={theme.colors.primary} style={{ marginBottom: theme.spacing(2) }} />
          <AppText variant="title" style={{ textAlign: 'center', marginBottom: theme.spacing(1) }}>
            {isSubscribed ? "You're a Pro!" : "Unlock Everything"}
          </AppText>
          <AppText muted style={{ textAlign: 'center' }}>
            {isSubscribed ? "Thank you for supporting Choner." : "Reach your peak potential with exclusive tools."}
          </AppText>
        </Card>
        
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
            <AppText variant="label">Included Features</AppText>
          </View>
          <AppText muted>Unlimited personalized challenges, advanced AI adjustments, better matching, richer insights.</AppText>
        </Card>
        
        <View style={{ marginTop: theme.spacing(2) }}>
          <Button 
            label={isSubscribed ? "Premium Active" : "Subscribe for $9.99 / month"} 
            variant={isSubscribed ? "secondary" : "primary"} 
            disabled={isSubscribed}
            onPress={handleSubscribe}
          />
          <AppText variant="caption" muted style={{ textAlign: 'center', marginTop: theme.spacing(2) }}>
            {isSubscribed ? "Manage subscriptions in App Store settings." : "Cancel anytime. Billed monthly."}
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}
