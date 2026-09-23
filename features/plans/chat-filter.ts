// Mirror of public.meetup_message_problem() — a pre-check so the app can say
// "no phone numbers" before sending. The server is the rule; this only saves
// a round trip. scripts/sql-checks/90_meetup_chat.sql uses the same cases as
// chat-filter.test.ts, so a change to one should be made in both.
export type MessageProblem = 'phone_number' | 'link' | 'email' | 'handle';

export function meetupMessageProblem(body: string): MessageProblem | null {
  const run = body.match(/\+?\d[\d\s().-]{5,}\d/);
  if (run && run[0].replace(/\D/g, '').length >= 7) return 'phone_number';
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(body)) return 'email';
  if (/(https?:\/\/|www\.|[a-z0-9-]+\.(com|lk|net|org|io|me|app|co|info)\b)/i.test(body)) return 'link';
  if (/(^|\s)@[A-Za-z0-9_.]{2,}/.test(body)) return 'handle';
  return null;
}

export const PROBLEM_MESSAGE: Record<MessageProblem, string> = {
  phone_number: "Phone numbers can't be sent here — keep it in the app.",
  link: "Links can't be sent here.",
  email: "Email addresses can't be sent here — keep it in the app.",
  handle: "Social handles can't be sent here — keep it in the app."
};
