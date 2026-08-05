import { AppState, Platform } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';

// react-query's "refetch on focus" listens for browser window events, which
// never fire in React Native — so returning to the app refetched nothing and
// screens sat on stale data indefinitely (a partner could accept an invite and
// the inviter's Home would never notice). Wire focus to AppState instead.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 10,
      retry: 1
    }
  }
});
