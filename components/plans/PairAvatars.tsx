import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { theme } from '@/constants/theme';

// Both photos, first names underneath — used by the gate, "You two are in"
// and completion. `dimThem` greys the partner while they haven't checked in.
export function PairAvatars({
  me,
  them,
  dimThem = false,
  themLabel
}: {
  me: { name: string; avatarUrl: string | null };
  them: { name: string; avatarUrl: string | null };
  dimThem?: boolean;
  themLabel?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.person}>
        <Avatar uri={me.avatarUrl} name={me.name} size={64} ring />
        <AppText style={styles.name}>{me.name}</AppText>
      </View>
      <View style={[styles.person, dimThem && styles.dim]}>
        <Avatar uri={them.avatarUrl} name={them.name} size={64} ring />
        <AppText style={styles.name}>{themLabel ?? them.name}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing(4), marginVertical: theme.spacing(2) },
  person: { alignItems: 'center', gap: 6 },
  dim: { opacity: 0.4 },
  name: { color: theme.colors.text, fontSize: 13 }
});
