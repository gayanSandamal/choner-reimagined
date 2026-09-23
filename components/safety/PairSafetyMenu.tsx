import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useBlockPartner } from '@/features/safety/hooks';
import { blockConfirmCopy, safetyRefusalMessage } from '@/features/safety/rules';
import { confirmAction, notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

// The "···" in the top bar, for as long as a pairing exists.
//
// Block and Report are two rows, never one button. Block is the quiet exit and
// asks for nothing; Report is the escalation and always blocks as well. They
// sit side by side so neither reads as the lesser version of the other.
export function PairSafetyMenu({
  userChallengeId,
  partnerFirstName,
  tone = 'onNavy'
}: {
  userChallengeId: string;
  partnerFirstName: string;
  // 'onNavy' for the floating top bar; 'ink' on a light header.
  tone?: 'onNavy' | 'ink';
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const block = useBlockPartner();

  const onBlock = async () => {
    setOpen(false);
    // iOS drops a system alert presented while a Modal is still animating out,
    // so the confirmation would silently never appear. Let the sheet close first.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const ok = await confirmAction({
      ...blockConfirmCopy(partnerFirstName),
      confirmLabel: 'Block',
      cancelLabel: 'Cancel',
      destructive: true
    });
    if (!ok) return;
    try {
      const result = await block.mutateAsync(userChallengeId);
      // "No partner" means it already ended — most likely from the other side
      // a moment earlier. The outcome the user asked for holds either way.
      if (!result.ok && result.reason !== 'no_partner') {
        notify('Could not block', safetyRefusalMessage(result.reason));
        return;
      }
      router.push({ pathname: '/modals/match-ended', params: { role: 'blocker' } });
    } catch (error: any) {
      notify('Could not block', error.message);
    }
  };

  const onReport = () => {
    setOpen(false);
    router.push({
      pathname: '/modals/report',
      params: { mode: 'pair', id: userChallengeId, name: partnerFirstName }
    });
  };

  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        disabled={block.isPending}
        hitSlop={10}
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel={`Options for your match with ${partnerFirstName}`}
        style={styles.trigger}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={20}
          color={tone === 'ink' ? theme.colors.text : theme.colors.onNavy}
        />
      </PressableScale>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.scrim}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          {/* Taps inside the card must not fall through to the scrim. */}
          <Pressable style={[styles.card, { marginBottom: insets.bottom + theme.spacing(2) }]}>
            <Row icon="ban-outline" label={`Block ${partnerFirstName}`} onPress={onBlock} />
            <Row icon="flag-outline" label={`Report ${partnerFirstName}`} onPress={onReport} />
            <Row label="Cancel" onPress={() => setOpen(false)} quiet />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Row({
  icon,
  label,
  onPress,
  quiet = false
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  quiet?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.row, quiet && styles.rowQuiet]}
    >
      <View style={styles.rowInner}>
        {icon ? <Ionicons name={icon} size={17} color={theme.colors.text} /> : null}
        <AppText style={[styles.rowLabel, quiet && styles.rowLabelQuiet]}>{label}</AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  trigger: { paddingHorizontal: 6, paddingVertical: 4 },
  scrim: {
    flex: 1,
    backgroundColor: theme.colors.overlayDim,
    justifyContent: 'flex-end'
  },
  card: {
    marginHorizontal: theme.spacing(1.5),
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(1.5),
    gap: theme.spacing(1),
    ...theme.shadow.lg
  },
  row: {
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(1.5)
  },
  rowQuiet: { backgroundColor: 'transparent' },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) },
  rowLabel: { color: theme.colors.text, fontSize: 14 },
  rowLabelQuiet: { color: theme.colors.muted, textAlign: 'center', flex: 1 }
});
