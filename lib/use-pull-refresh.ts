import { useCallback, useState } from 'react';

// Pull-to-refresh that only spins for a pull.
//
// Every scroll view used to pass a query's `isRefetching` as `refreshing`. That
// flag is also true for the background refetches React Query runs on focus,
// on reconnect and on a polling interval, so iOS slid its spinner down under
// the top bar on screens nobody had touched (#115). The spinner now tracks the
// pull itself: on while `refetch` runs, off when it settles, whatever else the
// queries are doing in the background.
export function usePullRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
