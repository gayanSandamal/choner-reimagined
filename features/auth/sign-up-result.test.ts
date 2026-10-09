import { signUpOutcome } from './sign-up-result';

describe('signUpOutcome', () => {
  it('is signed in when Supabase returns a session', () => {
    expect(signUpOutcome({ identities: [{}] }, true)).toBe('signed_in');
  });

  it('needs verification for a new account with no session', () => {
    expect(signUpOutcome({ identities: [{ provider: 'email' }] }, false)).toBe('needs_verification');
  });

  it('is already registered when the placeholder user has no identities', () => {
    expect(signUpOutcome({ identities: [] }, false)).toBe('already_registered');
  });

  it('falls back to needs verification when identities are missing', () => {
    expect(signUpOutcome({}, false)).toBe('needs_verification');
    expect(signUpOutcome(null, false)).toBe('needs_verification');
  });
});
