import { signUpSchema, forgotPasswordSchema, resetPasswordSchema } from './schema';

describe('signUpSchema', () => {
  const base = {
    fullName: 'Test User',
    email: 'test@example.com',
    password: 'supersecret',
    confirmPassword: 'supersecret',
    acceptTerms: true as const,
  };

  it('accepts a valid signup', () => {
    expect(signUpSchema.safeParse(base).success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = signUpSchema.safeParse({ ...base, confirmPassword: 'different' });
    expect(result.success).toBe(false);
  });

  it('rejects when terms are not accepted', () => {
    const result = signUpSchema.safeParse({ ...base, acceptTerms: false as unknown as true });
    expect(result.success).toBe(false);
  });

  it('rejects short passwords', () => {
    const result = signUpSchema.safeParse({ ...base, password: 'short', confirmPassword: 'short' });
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
  });
  it('rejects invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts matching passwords', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'longenough', confirmPassword: 'longenough' }).success
    ).toBe(true);
  });
  it('rejects mismatched passwords', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'longenough', confirmPassword: 'different' }).success
    ).toBe(false);
  });
});
