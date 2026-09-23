import { useEffect, useRef } from 'react';
import { router, useSegments } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { markRead } from '@/features/notifications/api';
import { useSession } from '@/providers/session-provider';

// The other side of a block or report. They get the neutral in-app notice
// written by notify_match_ended(); this turns it into the handover's "ended"
// screen — shown once, then the notice is marked read so it never returns.
//
// Keyed under ['notifications', …] on purpose: the realtime handler already
// invalidates that prefix when a row arrives, so this reacts within a second.
// Waits until the user is inside the tabs, so the boot redirect can't swallow it.
export function MatchEndedGate() {
  const { session } = useSession();
  const userId = session?.user.id;
  const segments = useSegments();
  const queryClient = useQueryClient();
  const shown = useRef<Set<string>>(new Set());

  const noticeQ = useQuery({
    queryKey: ['notifications', 'match-ended', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId!)
        .eq('kind', 'match_ended')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    }
  });

  const noticeId = noticeQ.data?.id;
  const inTabs = segments[0] === '(tabs)';

  useEffect(() => {
    if (!noticeId || !inTabs || shown.current.has(noticeId)) return;
    shown.current.add(noticeId);
    router.push({ pathname: '/modals/match-ended', params: { role: 'other' } });
    markRead(noticeId)
      .then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
      .catch(() => {
        // Worst case it shows once more next launch; never block the screen.
      });
  }, [noticeId, inTabs, queryClient]);

  return null;
}
