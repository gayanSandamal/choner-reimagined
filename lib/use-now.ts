import { useEffect, useState } from 'react';

// The current time, re-read on an interval, for anything that counts down.
// Coarse on purpose: a clock that shows minutes has no use for a per-second
// re-render.
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
