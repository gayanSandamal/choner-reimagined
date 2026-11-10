import { buildInviteLink, inviteMessage, INVITE_WEB_LIVE } from './invite-link';

// The app's own address comes from the manifest, which a test does not have.
jest.mock('expo-linking', () => ({ createURL: (path: string) => `choner://${path}` }));

// A .tsx only so it runs in the render project: the module it tests imports
// react-native, which the plain-TypeScript project cannot load.
const TOKEN = 'bab8bba8a4eb581c81cc7089f984e62c1169';

describe('the invite link (#193)', () => {
  it('is a web address carrying the short code once the host is live', () => {
    expect(buildInviteLink(TOKEN, 'WALW89', true)).toBe('https://app.choner.io/invite/WALW89');
  });

  it('falls back to the long token for an invite made before codes existed', () => {
    expect(buildInviteLink(TOKEN, null, true)).toBe(`https://app.choner.io/invite/${TOKEN}`);
    expect(buildInviteLink(TOKEN, '  ', true)).toBe(`https://app.choner.io/invite/${TOKEN}`);
  });

  it("keeps the app's own address until the host is switched on", () => {
    expect(buildInviteLink(TOKEN, 'WALW89', false)).toContain(`invite/${TOKEN}`);
    expect(buildInviteLink(TOKEN, 'WALW89', false)).not.toContain('https://app.choner.io');
  });

  it('puts the words, the link and the code on their own lines', () => {
    expect(inviteMessage(TOKEN, 'Gayan', 'WALW89', 'Gayan is challenging you to go for a walk. Are you up for it?', true)).toBe(
      'Gayan is challenging you to go for a walk. Are you up for it?\nhttps://app.choner.io/invite/WALW89\nCode: WALW89'
    );
  });

  it('always carries the code, for someone without the app', () => {
    expect(inviteMessage(TOKEN, 'Gayan', 'WALW89', null, true)).toContain('enter WALW89.');
    expect(inviteMessage(TOKEN, null, 'WALW89', '', true)).toContain('https://app.choner.io/invite/WALW89');
  });

  // The switch is a deliberate, separate step: app.choner.io has to be serving
  // web/invite first, or every invite becomes a tappable link to nowhere. If
  // this fails because you turned it on, check the host is up, then change the
  // expectation with it.
  it('is still switched off', () => {
    expect(INVITE_WEB_LIVE).toBe(false);
  });
});
