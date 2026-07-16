import { useEffect, useState } from 'react';

// Minimum time the branded splash stays visible before any routing proceeds,
// measured from JS boot (module load) so font/session loading time counts
// toward it rather than stacking on top of it. Consumed by BOTH navigation
// triggers — the auth gate in app/_layout.tsx and the redirect in
// app/index.tsx — since either one can move the user off the splash.
const MIN_SPLASH_MS = 3000;
const bootTime = Date.now();

export function useSplashHoldElapsed() {
  const [elapsed, setElapsed] = useState(() => Date.now() - bootTime >= MIN_SPLASH_MS);

  useEffect(() => {
    if (elapsed) return;
    const remaining = Math.max(0, MIN_SPLASH_MS - (Date.now() - bootTime));
    const timer = setTimeout(() => setElapsed(true), remaining);
    return () => clearTimeout(timer);
  }, [elapsed]);

  return elapsed;
}
