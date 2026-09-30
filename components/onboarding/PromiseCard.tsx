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
}

export function PromiseCard({ icon, title, description }: Props) {
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
  icon: { fontSize: 22, lineHeight: 28 },
  textBlock: { flex: 1, gap: 2 }
});
