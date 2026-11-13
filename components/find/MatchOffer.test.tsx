import { fireEvent, screen } from '@testing-library/react-native';
import { MatchOffer } from './MatchOffer';
import { renderWithProviders } from '@/test/render';
import { supabase } from '@/lib/supabase';
import { confirmAction } from '@/lib/alert';

const NOW = new Date('2026-10-04T10:00:00Z');
const inMs = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

const offer = (over: Record<string, unknown> = {}): any => ({
  matched: true,
  match_id: 'm1',
  partner_first_name: 'Dinesh',
  partner_avatar_url: null,
  blurb: 'Early mornings suit you both.',
  habit: 'Running',
  duration_days: 7,
  i_confirmed: false,
  they_confirmed: false,
  i_requested: true,
  expires_at: inMs(23 * 3600e3 + 12 * 60e3),
  searches_left: 2,
  daily_limit: 3,
  ...over
});

const show = (over: Record<string, unknown> = {}, onRefresh = jest.fn()) =>
  renderWithProviders(<MatchOffer match={offer(over)} challengeId="c1" onRefresh={onRefresh} now={NOW} />);

beforeEach(() => jest.clearAllMocks());

describe('MatchOffer', () => {
  it('offered: their photo, why you matched, the clock, the two answers', async () => {
    await show();
    expect(screen.getByText(/You found/)).toBeTruthy();
    expect(screen.getByText('a Match.')).toBeTruthy();
    expect(screen.getByText('Dinesh')).toBeTruthy();
    expect(screen.getByText('WHY YOU MATCHED')).toBeTruthy();
    expect(screen.getByText('You are both doing Running')).toBeTruthy();
    expect(screen.getByText('Early mornings suit you both.')).toBeTruthy();
    expect(screen.getByText('23h 12m left')).toBeTruthy();
    expect(screen.getByText("Let's do this")).toBeTruthy();
    expect(screen.getByText('Not quite right')).toBeTruthy();
    expect(screen.getByText('2 of 3 searches left today')).toBeTruthy();
    // The old model's "7-day challenge" must not come back.
    expect(screen.queryByText(/day challenge/)).toBeNull();
  });

  it('asks the person who was waiting a different question', async () => {
    await show({ i_requested: false });
    expect(screen.getByText(/Dinesh wants/)).toBeTruthy();
    expect(screen.getByText('to pair up.')).toBeTruthy();
    // They never asked for a search, so no search count is shown to them.
    expect(screen.queryByText(/searches left today/)).toBeNull();
  });

  it('accepting confirms this match', async () => {
    await show();
    fireEvent.press(screen.getByText("Let's do this"));
    await screen.findByText("Let's do this");
    expect(supabase.rpc).toHaveBeenCalledWith('confirm_match', { p_match_id: 'm1' });
  });

  it('you accepted: waiting on them, the same clock, and a way to back out', async () => {
    await show({ i_confirmed: true });
    expect(screen.getByText(/You're/)).toBeTruthy();
    expect(screen.getByText('in.')).toBeTruthy();
    expect(screen.getByText(/Waiting for Dinesh to accept/)).toBeTruthy();
    expect(screen.getByText('23h 12m left')).toBeTruthy();
    expect(screen.getByText('Back out')).toBeTruthy();
    expect(screen.queryByText("Let's do this")).toBeNull();
  });

  it('backing out warns first, then declines', async () => {
    await show({ i_confirmed: true });
    fireEvent.press(screen.getByText('Back out'));
    await screen.findByText('Back out');
    expect(confirmAction).toHaveBeenCalledWith(expect.objectContaining({ title: 'Back out of this match?' }));
    expect(supabase.rpc).toHaveBeenCalledWith('decline_match', { p_match_id: 'm1' });
  });

  it('expired: says so, blames nobody, and stops offering Accept', async () => {
    const onRefresh = jest.fn();
    await show({ expires_at: inMs(-1000) }, onRefresh);
    expect(screen.getByText('This match ran out of time.')).toBeTruthy();
    expect(screen.queryByText("Let's do this")).toBeNull();
    expect(screen.queryByText('Not quite right')).toBeNull();
    fireEvent.press(screen.getByText('See your search'));
    expect(onRefresh).toHaveBeenCalled();
  });
});
