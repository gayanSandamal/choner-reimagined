import { meetupMessageProblem } from './chat-filter';

// Same cases as scripts/sql-checks/90_meetup_chat.sql (line f1).
describe('meetupMessageProblem mirrors the server filter', () => {
  it.each([
    ['call me +94 77 123 4567', 'phone_number'],
    ['0771234567', 'phone_number'],
    ['see insta.com/me', 'link'],
    ['mail me a@b.lk', 'email'],
    ['I am @gayan_runs', 'handle'],
    ['Red cap by the fountain, gate 2', null],
    ['Running 5 km at 6:30', null]
  ])('%s → %s', (body, want) => {
    expect(meetupMessageProblem(body)).toBe(want);
  });
});
