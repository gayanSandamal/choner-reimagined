import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { theme } from '@/constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

export function ListItem({ title, subtitle, icon, onPress, rightElement, showChevron = false }: Props) {
  const content = (
    <View style={styles.container}>
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
      )}
      <View style={styles.textContainer}>
        <AppText>{title}</AppText>
        {subtitle && <AppText variant="caption" muted>{subtitle}</AppText>}
      </View>
      {rightElement}
      {showChevron && !rightElement && (
        <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          pressed && { backgroundColor: theme.colors.surfaceHighlight }
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.pressable}>{content}</View>;
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing(1.5),
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(2),
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing(2),
  },
  textContainer: {
    flex: 1,
    gap: 2,
    marginRight: theme.spacing(1),
  }
});
