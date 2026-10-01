import { fireEvent, screen } from '@testing-library/react-native';
import { SessionDetails } from './SessionDetails';
import { renderWithProviders } from '@/test/render';
import { supabase } from '@/lib/supabase';
import { confirmAction } from '@/lib/alert';

const NOW = new Date(2026, 9, 4, 9, 0, 0);
const today = new Date(2026, 9, 4, 18, 30, 0).toISOString();
const later = new Date(2026, 9, 7, 7, 0, 0).toISOString();

const member = (over: Record<string, unknown> = {}) => ({
  distance_answer: '5 km',
  mode_answer: null,
  confirmed_at: today,
  on_my_way_at: null,
  here_at: null,
  finished_at: null,
  checkin: null,
  checkin_at: null,
  miss_reason: null,
  ...over
});

const plan = (over: Record<string, unknown> = {}): any => ({
  id: 'p1',
  kind: 'meetup',
  status: 'confirmed',
  activity_key: 'running',
  mode: 'together',
  distance: '5 km',
  place_name: 'Viharamahadevi Park',
  place_text: 'Main gate',
  meeting_location_status: 'agreed',
  founder_help_required: false,
  starts_at: today,
  i_open: true,
  me: member(),
  them: { ...member(), first_name: 'Dinesh', avatar_url: null },
  messages: [],
  open_proposals: [],
  ...over
});

const cancelAsk = (mine: boolean) => ({
  id: 'c1',
  field: 'cancel',
  mine,
  round: 1,
  value: { expires_at: new Date(2026, 9, 5, 0, 0, 0).toISOString() }
});

const show = (over: Record<string, unknown> = {}) =>
  renderWithProviders(
    <SessionDetails plan={plan(over)} challengeId="uc1" me={{ name: 'Gayan', avatarUrl: null }} now={NOW} />
  );

beforeEach(() => jest.clearAllMocks());

describe('SessionDetails', () => {
  it('shows where, how, how much and both statuses', async () => {
    await show({ them: { ...member({ late_minutes: 10 }), first_name: 'Dinesh', avatar_url: null } });
    expect(screen.getByText('Together, in person')).toBeTruthy();
    expect(screen.getByText('Viharamahadevi Park, Main gate')).toBeTruthy();
    expect(screen.getByText('5 km each time')).toBeTruthy();
    expect(screen.getByText("You're in")).toBeTruthy();
    expect(screen.getByText('Running about 10 minutes late')).toBeTruthy();
  });

  it('offers Nudge and Running late on the day', async () => {
    await show();
    expect(screen.getByText('Nudge Dinesh')).toBeTruthy();
    expect(screen.getByText('Running late?')).toBeTruthy();
    expect(screen.getByText("Open today's run")).toBeTruthy();
  });

  it('offers neither on any other day', async () => {
    await show({ starts_at: later });
    expect(screen.queryByText('Nudge Dinesh')).toBeNull();
    expect(screen.queryByText('Running late?')).toBeNull();
    expect(screen.queryByText("Open today's run")).toBeNull();
    // Move and Cancel are always there for a planned session.
    expect(screen.getByText('Move this run')).toBeTruthy();
    expect(screen.getByText('Cancel this run')).toBeTruthy();
  });

  it('running late asks how late, then tells the other person', async () => {
    await show();
    fireEvent.press(screen.getByText('Running late?'));
    fireEvent.press(await screen.findByText('10 min'));
    await screen.findByText('How late?');
    expect(supabase.rpc).toHaveBeenCalledWith('set_running_late', { p_plan_id: 'p1', p_minutes: 10 });
  });

  it('cancel warns first, and only then asks the other person', async () => {
    await show({ starts_at: later });
    fireEvent.press(screen.getByText('Cancel this run'));
    await screen.findByText('Cancel this run');
    const warning = (confirmAction as jest.Mock).mock.calls[0][0];
    expect(warning.title).toBe('Cancel this run?');
    expect(warning.message).toContain("can't be undone");
    expect(warning.message).toContain('Dinesh has to agree');
    expect(supabase.rpc).toHaveBeenCalledWith('propose_cancel', { p_plan_id: 'p1' });
  });

  it('does not ask when the warning is declined', async () => {
    (confirmAction as jest.Mock).mockResolvedValueOnce(false);
    await show({ starts_at: later });
    fireEvent.press(screen.getByText('Cancel this run'));
    await screen.findByText('Cancel this run');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('their cancel request is answered here: keep it on, or agree', async () => {
    await show({ starts_at: later, open_proposals: [cancelAsk(false)] });
    expect(screen.getByText('Dinesh asked to cancel this run.')).toBeTruthy();
    expect(screen.getByText('Agree to cancel')).toBeTruthy();
    // Nothing else can be done to the session while that is open.
    expect(screen.queryByText('Move this run')).toBeNull();
    fireEvent.press(screen.getByText('Keep it on'));
    await screen.findByText('Keep it on');
    expect(supabase.rpc).toHaveBeenCalledWith('answer_cancel', { p_proposal_id: 'c1', p_agree: false });
  });

  it('my own request waits, and says the plan stands if they do not answer', async () => {
    await show({ starts_at: later, open_proposals: [cancelAsk(true)] });
    expect(screen.getByText('You asked to cancel.')).toBeTruthy();
    expect(screen.getByText(/the plan stands/)).toBeTruthy();
    expect(screen.getByText('Take that back')).toBeTruthy();
    expect(screen.queryByText('Agree to cancel')).toBeNull();
  });

  it('reports are for meetups only', async () => {
    await show();
    expect(screen.getByText('Report a problem')).toBeTruthy();
  });

  it('a session done separately has no place, no late button and no report link', async () => {
    await show({ mode: 'separate', place_name: null, place_text: null });
    expect(screen.getByText('Separately, together')).toBeTruthy();
    expect(screen.queryByText('Where')).toBeNull();
    expect(screen.queryByText('Running late?')).toBeNull();
    expect(screen.queryByText('Report a problem')).toBeNull();
  });
});
