import type { ReactElement } from 'react';
import { act } from 'react';
import { QueryClient, QueryClientProvider, notifyManager } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';

// A query or mutation settling re-renders whoever is subscribed. Routed
// through act() so React sees those updates as part of the test rather than
// warning that something changed behind its back.
//
// The testing library switches React's act environment on only around its own
// calls, and these updates arrive on a timer outside them, so the flag is set
// for the length of the update and put back.
notifyManager.setNotifyFunction((fn) => {
  const env = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const before = env.IS_REACT_ACT_ENVIRONMENT;
  env.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    act(fn);
  } finally {
    env.IS_REACT_ACT_ENVIRONMENT = before;
  }
});

// Render with the providers a component expects. A fresh client per render,
// with retries off so a failing query fails the test instead of hanging it.
export function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } }
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
