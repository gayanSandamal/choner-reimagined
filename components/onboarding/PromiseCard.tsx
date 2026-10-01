import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Icon, IconName, isIconName } from '@/components/ui/Icon';
import { theme } from '@/constants/theme';

interface Props {
  // Same contract as OptionCard: an icon key draws the line icon, anything
  // else renders as-is so emoji callers keep working until they are converted.
  icon: IconName | React.ReactNode;
  title: string;
  description: string;
  // Glass on the dark intro: a white wash on a white hairline, no blur. The
  // default is the white paper card used everywhere else.
  glass?: boolean;
}

export function PromiseCard({ icon, title, description, glass = false }: Props) {
  if (glass) {
    return (
      <View style={[styles.card, styles.glass]}>
        <View style={[styles.iconBox, styles.glassIconBox]}>
          {isIconName(icon) ? (
            <Icon name={icon} size={22} color={theme.colors.primary} />
          ) : (
            <AppText style={styles.icon}>{icon}</AppText>
          )}
        </View>
        <View style={styles.textBlock}>
          <AppText variant="subtitle" style={styles.glassTitle}>{title}</AppText>
          <AppText variant="caption" style={styles.glassBody}>{description}</AppText>
        </View>
      </View>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.iconBox}>
        {isIconName(icon) ? (
          <Icon name={icon} size={22} color={theme.colors.primary} />
        ) : (
          <AppText style={styles.icon}>{icon}</AppText>
        )}
      </View>
      <View style={styles.textBlock}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText variant="caption" muted>
          {description}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2)
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  glass: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2)
  },
  glassIconBox: { backgroundColor: 'rgba(255,255,255,0.08)' },
  glassTitle: { color: '#FFFFFF' },
  glassBody: { color: 'rgba(255,255,255,0.72)' },
  icon: { fontSize: 22, lineHeight: 28 },
  textBlock: { flex: 1, gap: 2 }
});
