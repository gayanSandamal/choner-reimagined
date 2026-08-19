import { useState } from 'react';
import { MatchCard } from './MatchCard';

// The Challenges-tab presentation of a match: the same card as Find, but
// dismissible.
//
// A match can land while someone is mid-challenge on their own, and replacing
// the whole screen at that moment is jarring — the gentler read is an arrival
// above what they were already doing. "Later" only hides it for this session;
// the match is still waiting on them next time.
export function MatchBanner({ city }: { city?: string | null }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return <MatchCard city={city} onDismiss={() => setDismissed(true)} />;
}
