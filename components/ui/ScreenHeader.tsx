import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { theme } from '@/constants/theme';

interface Props {
  title: string;
  onBack?: () => void;
  onClose?: () => void;
  rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, onClose, rightElement }: Props) {
  const handlePress = onBack || onClose;
  const iconName = onBack ? 'arrow-back' : 'close';

  return (
    <View style={styles.header}>
      {handlePress && (
        <Pressable onPress={handlePress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} accessibilityLabel={onBack ? "Go back" : "Close"}>
          <Ionicons name={iconName} size={24} color={theme.colors.text} />
        </Pressable>
      )}
      <AppText variant="title" style={styles.title}>{title}</AppText>
      {rightElement && <View style={styles.right}>{rightElement}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  title: {
    flex: 1,
  },
  right: {
    marginLeft: 16,
  }
});
