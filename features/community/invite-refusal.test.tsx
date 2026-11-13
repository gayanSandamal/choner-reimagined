import { inviteRefusalFromError, inviteRefusalFromPreview } from './api';

// A .tsx only so it runs in the render project: api.ts imports the Supabase
// client, which the plain-TypeScript project cannot load.

const base = {
  found: true as const,
  own: false,
  status: 'pending',
  mine: false,
  expired: false,
  expires_at: null,
  inviter_first_name: 'Gayan',
  activity: 'Walking',
  replaces: null,
  blocked: null
};

describe('an invite works once (10 Nov 2026)', () => {
  it('lets a fresh, unexpired invite through', () => {
    expect(inviteRefusalFromPreview(base)).toBeNull();
    // A different challenge is not a refusal: the screen asks first.
    expect(inviteRefusalFromPreview({ ...base, replaces: 'Running' })).toBeNull();
  });

  it('stops a link you already used, instead of joining again', () => {
    expect(inviteRefusalFromPreview({ ...base, status: 'accepted', mine: true })).toBe('already_joined');
  });

  it('stops a link someone else used, an expired one, and your own', () => {
    expect(inviteRefusalFromPreview({ ...base, status: 'accepted', used: true })).toBe('used');
    // An older server says nothing about "used", but the status does.
    expect(inviteRefusalFromPreview({ ...base, status: 'accepted' })).toBe('used');
    expect(inviteRefusalFromPreview({ ...base, expired: true })).toBe('expired');
    expect(inviteRefusalFromPreview({ ...base, own: true })).toBe('own');
    expect(inviteRefusalFromPreview({ found: false })).toBe('not_found');
  });

  it('never goes over a partner or a match that is waiting', () => {
    expect(inviteRefusalFromPreview({ ...base, blocked: 'you_partnered' })).toBe('you_partnered');
    expect(inviteRefusalFromPreview({ ...base, blocked: 'match_waiting' })).toBe('match_waiting');
    expect(inviteRefusalFromPreview({ ...base, blocked: 'they_partnered' })).toBe('they_partnered');
  });

  it("reads the server's refusal, by hint or by the older messages", () => {
    expect(inviteRefusalFromError({ hint: 'invite_already_joined', message: 'x' })).toBe('already_joined');
    expect(inviteRefusalFromError({ hint: 'invite_match_waiting' })).toBe('match_waiting');
    expect(inviteRefusalFromError({ message: 'this invite has already been used by someone else' })).toBe('used');
    expect(inviteRefusalFromError({ message: 'you cannot accept your own invite' })).toBe('own');
    expect(inviteRefusalFromError({ message: 'You already have a partner. End that match before joining another.' })).toBe(
      'you_partnered'
    );
    expect(inviteRefusalFromError({ message: 'network down' })).toBeNull();
  });
});
