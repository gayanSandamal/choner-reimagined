import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useBlockMilestoneSharer } from '@/features/safety/hooks';
import { blockSharerConfirmCopy, safetyRefusalMessage } from '@/features/safety/rules';
import { confirmAction, notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

// The "···" on a Community card.
//
// MilestoneRow is deliberately minimal — its own comment says reading the card
// is the whole interaction, apart from one tap to say well done — so this sits
// quietly: muted, small, and only on other people's cards. It is visible
// rather than a long-press because a blocking control nobody can find does not
// count as one, for Play's user-generated content policy or for the person who
// needs it.
//
// Block only. Reporting a person is reached from a pairing, where the report
// categories ("Didn't show up", "Safety concern at a meetup") actually mean
// something; none of them describe a milestone card you read in a feed.
export function FeedSafetyMenu({
  milestoneId,
  sharerFirstName
}: {
  milestoneId: string;
  sharerFirstName: string;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const block = useBlockMilestoneSharer();

  const onBlock = async () => {
    setOpen(false);
    // Same reason as PairSafetyMenu: iOS drops a system alert presented while
    // a Modal is still animating out, so the confirmation never appears.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const ok = await confirmAction({
      ...blockSharerConfirmCopy(sharerFirstName),
      confirmLabel: 'Block',
      cancelLabel: 'Cancel',
      destructive: true
    });
    if (!ok) return;
    try {
      const result = await block.mutateAsync(milestoneId);
      if (!result.ok) {
        notify('Could not block', safetyRefusalMessage(result.reason));
        return;
      }
      // No navigation: the card simply leaves the feed when it refetches. A
      // screen announcing what happened would be louder than the action.
      notify('Blocked', `You won't see ${sharerFirstName} in Community again.`);
    } catch (error: any) {
      notify('Could not block', error.message);
    }
  };

  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        disabled={block.isPending}
        hitSlop={10}
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel={`Options for ${sharerFirstName}'s post`}
        style={styles.trigger}
      >
        <Ionicons name="ellipsis-horizontal" size={16} color={theme.colors.muted} />
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
            <Row icon="ban-outline" label={`Block ${sharerFirstName}`} onPress={onBlock} />
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
  trigger: { paddingHorizontal: 4, paddingVertical: 2 },
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
