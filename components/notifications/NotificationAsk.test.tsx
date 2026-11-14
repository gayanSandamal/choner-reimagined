import { fireEvent, render, screen } from '@testing-library/react-native';
import { NotificationAsk } from './NotificationAsk';
import { getPushStatus, registerForPushNotificationsAsync } from '@/lib/notifications';

jest.mock('@/lib/notifications', () => ({
  getPushStatus: jest.fn(),
  registerForPushNotificationsAsync: jest.fn()
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/features/notifications/api', () => ({ registerPushToken: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined)
}));

const status = getPushStatus as jest.Mock;
const register = registerForPushNotificationsAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('NotificationAsk', () => {
  it('explains first, then asks only when Continue is tapped', async () => {
    status.mockResolvedValue('undetermined');
    register.mockResolvedValue('token');
    await render(<NotificationAsk when userId="u1" partnerName="Gayan" />);
    expect(await screen.findByText('Know when Gayan shows up')).toBeTruthy();
    // The system prompt has not been shown yet.
    expect(register).not.toHaveBeenCalled();
    // Neutral wording: never "Allow".
    expect(screen.queryByText(/Allow/)).toBeNull();
    await fireEvent.press(screen.getByText('Continue'));
    expect(register).toHaveBeenCalledWith({ ask: true });
  });

  it('while searching, asks about the match itself', async () => {
    status.mockResolvedValue('undetermined');
    await render(<NotificationAsk when userId="u1" partnerName={null} />);
    expect(await screen.findByText('Know the moment we find your match')).toBeTruthy();
    expect(screen.queryByText(/Allow/)).toBeNull();
  });

  it('stays away before there is a partner or a match', async () => {
    status.mockResolvedValue('undetermined');
    await render(<NotificationAsk when={false} userId="u1" partnerName={null} />);
    expect(screen.queryByText(/Know when/)).toBeNull();
    expect(status).not.toHaveBeenCalled();
  });

  it('does not ask again once the phone has an answer', async () => {
    status.mockResolvedValue('granted');
    await render(<NotificationAsk when userId="u1" partnerName="Gayan" />);
    await Promise.resolve();
    expect(screen.queryByText(/Know when/)).toBeNull();
  });
});
