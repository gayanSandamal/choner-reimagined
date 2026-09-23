// Exact strings from the Find & Challenges handover (§3, §8). Anything here is
// the handover's wording; copy not in the handover lives next to the screen
// that uses it, so this file stays auditable against §8 line by line.
export const ACTIVITY_LABEL: Record<string, string> = {
  running: 'Running',
  walking: 'Walking',
  cycling: 'Cycling'
};

export const COPY = {
  gateHeading: "You're paired.",
  gateHeadingStrong: "Let's plan it.",
  gateButton: 'Plan your first run',
  sayHiHeading: 'You found your Match.',
  sayHiSub: 'Say hi before your first session.',
  safety: 'For your safety, keep the conversation in the app and hold off on sharing personal details.',
  stepsInHeading: 'You two',
  stepsInHeadingStrong: 'are in.',
  stepsInSub: "Let's plan your first run together.",
  stepsInButton: "Let's do it",
  howFar: 'How far would you like to run?',
  distanceConflict: 'You both have different distances in mind.',
  modeHeading: 'How do you want to do your first run?',
  modeTogether: 'Run together',
  modeTogetherSub: 'Meet up and run together',
  modeSeparate: 'Run separately, together',
  modeSeparateSub: 'Go for your run without meeting up, but stay accountable to each other.',
  soundsGood: 'Sounds good',
  suggestAnotherPlace: 'Suggest another place',
  needHelpPlace: 'Need help choosing a place?',
  needHelp: 'Need help choosing?',
  whenHeading: 'What works for you both?',
  needYourAnswer: 'Need your answer',
  chatOpensLine: "A quick chat opens once you're both at the meeting place.",
  imIn: "I'm in",
  commitTogether: 'Commit together',
  onMyWay: "I'm on my way",
  imHere: "I'm here",
  openQr: 'Open QR verification',
  finishRun: 'Finish',
  sameTime: 'Same time',
  differentTimes: 'Different times',
  checkinDone: 'Done',
  checkinLater: 'Doing it later',
  checkinCant: "Can't today",
  momentPrompt: 'Want to share a moment from today? Optional. A light touch, not proof.',
  photoPrivacy: "Only visible to each other as a view-once photo after you've both shared. Saved to your profile.",
  iveCompletedIt: "I've completed it",
  whatHappened: 'What happened?',
  motivational: 'It happens to everyone. What matters is that you keep showing up.',
  tryTomorrow: 'Try tomorrow instead?',
  moveActivity: 'Yes, move activity',
  catchUp: "No, I'll catch up",
  countingOnYou: 'Your partner is counting on you.',
  acceptChange: 'Accept the change',
  sendEncouragement: 'Send encouragement',
  youShowedUp: 'You showed up.',
  bothShowedUp: 'You both showed up.',
  waiting: 'Waiting',
  notNow: 'Not now',
  shareToInspire: 'Share to inspire'
} as const;

export const OPENER = 'Hey, ready to do this?';
export const REPLIES = { lets_go: "Let's go", cant_wait: "Can't wait", sounds_good: 'Sounds good' } as const;
export const DISTANCES = ['1 to 2 km', '3 km', '5 km', '5 to 10 km', '10 km or more', 'Not sure yet'] as const;
export const RECOVERY_REASONS = ['Too tired', 'No time', 'Weather', 'Work', 'Not feeling well', 'Something else'] as const;
export const REACTIONS = ['Nice', 'Keep going', 'Proud of you', "I'm next", 'Send a lift'] as const;

// Templated lines, built from whoever is looking.
export const lines = {
  itsOn: (day: string, time: string) => `It's on. ${day}, ${time}. Don't keep each other waiting.`,
  alreadyHereWaiting: (p: string) => `${p} is already here, waiting for you.`,
  alreadyHere: (p: string) => `${p} is already here.`,
  hereWaiting: (p: string) => `You're here. Waiting for ${p}.`,
  chatOpen: (p: string) => `A temporary chat is now open between you and ${p}.`,
  together: (distance: string) => `You're together. ${distance} starts now.`,
  partnerDone: (p: string, distance: string) => `${p} has completed their ${distance}. Your turn.`,
  laterNotice: (you: string) => `${you} hasn't run yet. They will do it later today.`,
  completedNotice: (you: string, distance: string) => `${you} completed their ${distance}.`,
  waitingFor: (p: string) => `Waiting for ${p}.`,
  gateEyebrow: (activity: string) => `Challenges · ${activity}`
};
