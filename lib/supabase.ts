import 'react-native-url-polyfill/auto';
import { LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// auth-js's own session-recovery logs a bare console.error whenever a stored
// refresh token turns out to be invalid (GoTrueClient#_recoverAndRefresh) -
// an expected condition on any device carrying a stale/revoked token, which
// it then correctly clears on its own right after logging it. LogBox treats
// every console.error as a full-screen crash overlay regardless of severity,
// which makes a normal sign-out-and-show-the-sign-in-screen case look like a
// dev error. Silence only this one known-benign message; every other error
// still surfaces normally.
if (__DEV__) {
  LogBox.ignoreLogs(['AuthApiError: Invalid Refresh Token']);
}
