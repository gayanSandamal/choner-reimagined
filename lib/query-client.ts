import { AppState, Platform } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import Constants from 'expo-constants';

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
      // As long as the saved copy below, or a query that's unused for a while
      // is dropped from memory before it's saved and the next launch waits
      // on the server again.
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1
    }
  }
});

// The last data each screen loaded is kept on the phone, so reopening the app
// shows it at once and refreshes it quietly instead of every screen waiting
// on the server (decided 17 November 2026, the server is slow on the free
// plan). Anything older than 30 seconds still refetches as soon as it's shown.
// A new app version starts clean, and signing out wipes it (signOut in
// session-provider).
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'choner-query-cache'
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: 1000 * 60 * 60 * 24,
  buster: Constants.expoConfig?.version ?? 'dev'
};
