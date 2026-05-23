import { Pressable } from 'react-native';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';

export function InviteCard({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <AppText variant="label">Invite a friend</AppText>
        <AppText muted>Start a private challenge with someone who keeps you accountable.</AppText>
      </Card>
    </Pressable>
  );
}
