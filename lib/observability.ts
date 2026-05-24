import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const ENV = process.env.EXPO_PUBLIC_ENV ?? 'development';

let posthog: PostHog | null = null;

export function initObservability() {
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENV,
      tracesSampleRate: ENV === 'production' ? 0.2 : 1.0,
      enableAutoSessionTracking: true,
    });
  }
  if (POSTHOG_KEY) {
    posthog = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST });
  }
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (SENTRY_DSN) Sentry.setUser({ id: userId, ...(traits ?? {}) });
  posthog?.identify(userId, traits);
}

export function clearUser() {
  if (SENTRY_DSN) Sentry.setUser(null);
  posthog?.reset();
}

export function track(name: string, props?: Record<string, any>) {
  posthog?.capture(name, props);
}

export function captureError(error: unknown, context?: Record<string, any>) {
  if (SENTRY_DSN) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } else {
    console.error('captured error', error, context);
  }
}

export const SentryWrap = Sentry.wrap;
