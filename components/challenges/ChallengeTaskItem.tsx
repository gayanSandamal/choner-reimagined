import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { theme } from '@/constants/theme';

interface Props {
  title: string;
  meta: string;
  completed?: boolean;
  onPress?: () => void;
}

export function ChallengeTaskItem({ title, meta, completed, onPress }: Props) {
  return (
    <Card
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(2)
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: completed ? theme.colors.primary : theme.colors.surface2,
          borderWidth: 1,
          borderColor: completed ? theme.colors.primary : theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {completed && <Ionicons name="checkmark" size={16} color="#000" />}
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ textDecorationLine: completed ? 'line-through' : 'none', color: completed ? theme.colors.muted : theme.colors.text }}>
          {title}
        </AppText>
        <AppText variant="caption" muted>{meta}</AppText>
      </View>
    </Card>
  );
}
