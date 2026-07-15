import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

export function AuthDivider() {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <AppText muted style={styles.text}>
        OR
      </AppText>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  text: {
    fontFamily: theme.fonts.bodyBold,
    letterSpacing: 1,
    marginHorizontal: 12
  }
});
