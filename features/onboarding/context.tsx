import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { EnergyValue, GoalValue, StruggleValue, ToneValue } from './constants';

// Quiz answers live in memory until the single profile write on the
// Screen 5 -> 6 transition, so back-navigation between steps keeps
// selections and skipped questions never null-out legacy profile values.
interface OnboardingState {
  goal: GoalValue | null;
  struggle: StruggleValue | null;
  tone: ToneValue | null;
  energy: EnergyValue | null;
  // Screen 7 progress, kept here so a failed invite can be retried
  // without starting a second challenge.
  startedChallengeId: string | null;
  sentInvite: { email: string } | null;
  setGoal: (v: GoalValue | null) => void;
  setStruggle: (v: StruggleValue | null) => void;
  setTone: (v: ToneValue) => void;
  setEnergy: (v: EnergyValue) => void;
  setStartedChallengeId: (id: string) => void;
  setSentInvite: (invite: { email: string } | null) => void;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [goal, setGoal] = useState<GoalValue | null>(null);
  const [struggle, setStruggle] = useState<StruggleValue | null>(null);
  const [tone, setTone] = useState<ToneValue | null>(null);
  const [energy, setEnergy] = useState<EnergyValue | null>(null);
  const [startedChallengeId, setStartedChallengeId] = useState<string | null>(null);
  const [sentInvite, setSentInvite] = useState<{ email: string } | null>(null);

  const value = useMemo(
    () => ({
      goal,
      struggle,
      tone,
      energy,
      startedChallengeId,
      sentInvite,
      setGoal,
      setStruggle,
      setTone,
      setEnergy,
      setStartedChallengeId,
      setSentInvite
    }),
    [goal, struggle, tone, energy, startedChallengeId, sentInvite]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
