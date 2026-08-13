import { useEffect, useState } from 'react';
import { usePartnerStatus } from '@/features/community/hooks';
import { getPendingInviteToken } from '@/lib/pending-invite';

// Does this user already have a partner on the other side of the fire?
//
// Signing up through an invite link still walks the full onboarding flow, so
// the post-quiz screens have to know. Someone who is already paired must never
// be asked to invite a partner, and must never be asked to pick a habit — the
// habit is the shared commitment they were invited INTO.
//
// Two signals, because redemption is asynchronous: `linked` is the settled
// truth, and a still-stashed token covers the window between signing up and
// app/_layout.tsx redeeming it.
//
// Note `linked` is true for BOTH sides of an accepted invite, not just the one
// who accepted. That is what these screens want — an inviter whose partner has
// already joined shouldn't be re-asked either — but it means this is "already
// paired", not literally "was invited". During a normal first run the inviter
// reaches Step 1 unpaired, so they still get the picker.
export function useIsInvitee(userId: string | undefined) {
  const partnerQ = usePartnerStatus(userId);

  // null = still checking, kept distinct from false so callers can hold the
  // frame rather than flash partner-less UI at someone who has a partner.
  const [hasPendingInvite, setHasPendingInvite] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPendingInviteToken()
      .then((t) => !cancelled && setHasPendingInvite(Boolean(t)))
      .catch(() => !cancelled && setHasPendingInvite(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    isInvitee: Boolean(partnerQ.data?.linked || hasPendingInvite),
    resolving: partnerQ.isLoading || hasPendingInvite === null,
    partnerQ
  };
}
