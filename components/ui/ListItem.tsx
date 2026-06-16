import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { theme } from '@/constants/theme';
import { PressableScale } from './PressableScale';

interface Props {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

export function ListItem({
  title,
  subtitle,
  icon,
  iconColor = theme.colors.primary,
  onPress,
  rightElement,
  showChevron = false
}: Props) {
  const content = (
    <View style={styles.container}>
      {icon && (
        <View style={[styles.iconContainer, { borderColor: `${iconColor}33` }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      )}
      <View style={styles.textContainer}>
        <AppText>{title}</AppText>
        {subtitle && (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        )}
      </View>
      {rightElement}
      {showChevron && !rightElement && (
        <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        scaleTo="subtle"
        haptic="light"
        style={styles.pressable}
      >
        {content}
      </PressableScale>
    );
  }

  return <View style={styles.pressable}>{content}</View>;
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing(1.5)
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(2)
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing(2)
  },
  textContainer: {
    flex: 1,
    gap: 2,
    marginRight: theme.spacing(1)
  }
});
