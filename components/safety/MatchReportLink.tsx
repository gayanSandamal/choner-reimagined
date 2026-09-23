import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';

// Match Found's plain "Report" link (handover §5.6). Reachable before AND
// after you've accepted: a concerning photo doesn't become fine because you
// tapped yes first. Block isn't offered at this stage — declining does that.
export function MatchReportLink({ matchId, partnerFirstName }: { matchId: string; partnerFirstName: string }) {
  return (
    <PressableScale
      onPress={() =>
        router.push({
          pathname: '/modals/report',
          params: { mode: 'match', id: matchId, name: partnerFirstName }
        })
      }
      haptic="selection"
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Report ${partnerFirstName}`}
    >
      <AppText style={styles.text}>Report</AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 11, color: '#D8D2CC', marginTop: 10, textAlign: 'center' }
});
