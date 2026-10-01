import { parseAuthLink } from './link';

describe('parseAuthLink', () => {
  it('reads the tokens out of a verification link', () => {
    expect(
      parseAuthLink(
        'choner://verify-email#access_token=AAA&expires_in=3600&refresh_token=RRR&token_type=bearer&type=signup'
      )
    ).toEqual({ kind: 'tokens', purpose: 'verify', accessToken: 'AAA', refreshToken: 'RRR' });
  });

  it('knows a recovery link is a reset, from the type or from the route', () => {
    expect(parseAuthLink('choner://reset-password#access_token=A&refresh_token=R&type=recovery')).toMatchObject({
      kind: 'tokens',
      purpose: 'reset'
    });
    // PKCE carries no type, so the route has to say it.
    expect(parseAuthLink('choner://reset-password?code=abc')).toEqual({
      kind: 'code',
      purpose: 'reset',
      code: 'abc'
    });
  });

  it('reads a token hash, with the otp type the purpose implies', () => {
    expect(parseAuthLink('choner://verify-email?token_hash=h1&type=email')).toEqual({
      kind: 'token_hash',
      purpose: 'verify',
      tokenHash: 'h1',
      otpType: 'email'
    });
    expect(parseAuthLink('choner://reset-password?token_hash=h2&type=recovery')).toMatchObject({
      purpose: 'reset',
      otpType: 'recovery'
    });
  });

  it('reports an expired link as an error, keeping which kind it was', () => {
    const link = parseAuthLink(
      'choner://reset-password?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    );
    expect(link).toEqual({
      kind: 'error',
      purpose: 'reset',
      description: 'Email link is invalid or has expired'
    });
  });

  it('works for the Expo Go and web forms of the same link', () => {
    expect(
      parseAuthLink('exp://192.168.1.2:8081/--/verify-email#access_token=A&refresh_token=R&type=signup')
    ).toMatchObject({ kind: 'tokens', purpose: 'verify' });
    expect(
      parseAuthLink('http://localhost:8081/verify-email#access_token=A&refresh_token=R&type=signup')
    ).toMatchObject({ kind: 'tokens', purpose: 'verify' });
  });

  it('leaves every other deep link alone', () => {
    expect(parseAuthLink(null)).toEqual({ kind: 'none' });
    expect(parseAuthLink('choner://')).toEqual({ kind: 'none' });
    expect(parseAuthLink('choner://invite/8f3a1c')).toEqual({ kind: 'none' });
    // A `code` param anywhere but the two auth routes is not ours to exchange.
    expect(parseAuthLink('choner://invite/abc?code=RUN4K7')).toEqual({ kind: 'none' });
    // An access token with no refresh token cannot make a session.
    expect(parseAuthLink('choner://verify-email#access_token=A')).toEqual({ kind: 'none' });
  });
});
