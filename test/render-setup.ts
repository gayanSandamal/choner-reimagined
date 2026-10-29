// Shared setup for render tests (*.test.tsx).
//
// Everything mocked here is something a component reaches for at import time
// that has no business running in a test: the Supabase client (wants env vars
// and device storage), navigation, the system alert, and animation.

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(async () => ({ data: null, error: null })),
    from: jest.fn(() => ({ select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() })),
    functions: { invoke: jest.fn(async () => ({ data: null, error: null })) },
    auth: { getSession: jest.fn(async () => ({ data: { session: null } })) },
    // Avatar signs its path on render (lib/avatars.ts). Answering with no
    // rows is the "could not sign" case, which renders initials — the same
    // thing every one of these tests saw when avatars were public URLs and
    // the fixtures passed null.
    storage: {
      from: jest.fn(() => ({
        createSignedUrl: jest.fn(async () => ({ data: null, error: null })),
        createSignedUrls: jest.fn(async () => ({ data: [], error: null })),
        upload: jest.fn(async () => ({ data: null, error: null })),
        remove: jest.fn(async () => ({ data: null, error: null }))
      }))
    }
  }
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  Link: 'Link'
}));

// Confirmations answer "yes" unless a test says otherwise, and nothing reaches
// the system dialog.
jest.mock('@/lib/alert', () => ({
  notify: jest.fn(),
  confirmAction: jest.fn(async () => true),
  registerToastHandler: jest.fn()
}));

jest.mock('@/lib/haptics', () => ({
  haptics: new Proxy({}, { get: () => jest.fn() })
}));

// SDK 58's expo-font resolves each font through Asset.fromModule() while the
// component renders, and jest has no asset registry for it to look in, so any
// screen with an @expo/vector-icons glyph died with `Module "1" is missing
// from the asset registry`. Fonts are a native concern; the icons render as
// their text content either way.
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  loadAsync: jest.fn().mockResolvedValue(undefined),
  isLoaded: () => true,
  isLoading: () => false,
  unloadAllAsync: jest.fn(),
  unloadAsync: jest.fn()
}));

// Reanimated 4 runs its worklets through react-native-worklets, which reaches
// for a native module on import. Its own mock has to be in place first.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Keyboard handling is native: the library's own mock swaps its scroll views
// for plain ones.
jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));

// Push is a device concern. The real module registers a token listener the
// moment it is imported, which keeps a test worker alive after the tests end.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  useLastNotificationResponse: () => null,
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  setNotificationCategoryAsync: jest.fn(async () => null)
}));
