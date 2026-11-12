import { activityLabel, postMeta, postProblem, POST_LIMIT } from './post-rules';

describe('a Community post', () => {
  it('needs words only when there is no photo', () => {
    expect(postProblem('text', '   ')).toBe('empty');
    expect(postProblem('photo', '')).toBeNull();
    expect(postProblem('text', 'Rain did not win today')).toBeNull();
  });

  it('keeps to 140 characters', () => {
    expect(postProblem('photo', 'a'.repeat(POST_LIMIT))).toBeNull();
    expect(postProblem('photo', 'a'.repeat(POST_LIMIT + 1))).toBe('too_long');
  });

  it('refuses phone numbers, @handles and links', () => {
    expect(postProblem('text', 'call me 077 123 4567')).toBe('contact_details');
    expect(postProblem('text', 'find me @dinesh.runs')).toBe('contact_details');
    expect(postProblem('text', 'see www.example.com')).toBe('contact_details');
    expect(postProblem('text', 'https://example.com')).toBe('contact_details');
    // Ordinary numbers are fine.
    expect(postProblem('text', '5 km in 32 minutes')).toBeNull();
  });

  it('says who it was with, from the reader', () => {
    expect(postMeta({ activity_key: 'walking', is_partner: false }, '2h')).toBe('Walking with their partner · 2h');
    expect(postMeta({ activity_key: 'running', is_partner: true }, '5m')).toBe('Running with you · 5m');
    expect(postMeta({ activity_key: null, is_partner: false }, '1d')).toBe('1d');
    expect(activityLabel('cycling')).toBe('Cycling');
  });
});
