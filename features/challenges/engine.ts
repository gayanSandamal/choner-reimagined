export interface ChallengeRecommendationInput {
  goal: string;
  struggle: string;
  stressLevel: 'low' | 'medium' | 'high';
  accountabilityMode: 'solo' | 'partner' | 'group' | 'public';
}

export function recommendStarterChallenge(input: ChallengeRecommendationInput) {
  const challengeName =
    input.goal === 'sleep'
      ? '7-Day Sleep Reset'
      : input.goal === 'stress'
      ? '5-Day Calm Sprint'
      : '7-Day Energy Reset';

  const intensity = input.stressLevel === 'high' ? 'light' : 'standard';

  return {
    challengeName,
    intensity,
    tasks:
      intensity === 'light'
        ? ['10 minute walk', '2L water', 'sleep before midnight']
        : ['7,000 steps', '2.5L water', 'sleep before 11:30 PM'],
    accountability:
      input.accountabilityMode === 'solo'
        ? 'ai_only'
        : input.accountabilityMode === 'partner'
        ? 'match_partner'
        : 'join_group'
  };
}
