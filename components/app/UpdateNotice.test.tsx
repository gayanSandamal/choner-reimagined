import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { UpdateNotice } from './UpdateNotice';
import { resetUpdateDismissal } from '@/features/app-update/dismissal';
import * as api from '@/features/app-update/api';
import { renderWithProviders } from '@/test/render';

// What this covers: which states put the card on screen, and what the two
// buttons do. How long a dismissal lasts is a rule about process lifetime and
// is pinned in features/app-update/dismissal.test.ts, where it needs no
// harness and cannot flake.

jest.mock('@/features/app-update/api', () => ({
  storePlatform: jest.fn(() => 'android'),
  installedVersion: jest.fn(() => '0.2.0'),
  getLatestRelease: jest.fn(),
  openStoreListing: jest.fn(async () => undefined)
}));

const PLAY_URL = 'https://play.google.com/store/apps/details?id=io.choner.app';

const release = (over: Partial<api.AppRelease> = {}): api.AppRelease => ({
  platform: 'android',
  latest_version: '0.3.0',
  store_url: PLAY_URL,
  notes: null,
  ...over
});

// Awaited, always. Under React 19 this render returns a PROMISE: skip the
// await and you get an empty object back and a `screen` that still says
// "render function has not been called", which reads like a broken harness
// rather than a missing keyword. Every render test in this repo awaits.
const show = () => renderWithProviders(<UpdateNotice />);

beforeEach(() => {
  jest.clearAllMocks();
  resetUpdateDismissal();
  (api.storePlatform as jest.Mock).mockReturnValue('android');
  (api.installedVersion as jest.Mock).mockReturnValue('0.2.0');
  (api.getLatestRelease as jest.Mock).mockResolvedValue(release());
});

describe('UpdateNotice', () => {
  it('offers the newer version and what it is', async () => {
    await show();
    expect(await screen.findByText('Update available')).toBeTruthy();
    expect(screen.getByText('Version 0.3.0')).toBeTruthy();
    expect(screen.getByText('Update now')).toBeTruthy();
    expect(screen.getByText('Dismiss')).toBeTruthy();
  });

  it('prefers the release note over the generic line', async () => {
    (api.getLatestRelease as jest.Mock).mockResolvedValue(
      release({ notes: 'Faster check-ins, fewer crashes.' })
    );
    await show();
    expect(await screen.findByText('Faster check-ins, fewer crashes.')).toBeTruthy();
    expect(screen.queryByText(/newer version of Choner is in the store/)).toBeNull();
  });

  it('shows nothing when the store is serving what is already installed', async () => {
    // The normal state of the world, and the state 202611061000 seeds.
    (api.getLatestRelease as jest.Mock).mockResolvedValue(release({ latest_version: '0.2.0' }));
    await show();
    await waitFor(() => expect(api.getLatestRelease).toHaveBeenCalled());
    expect(screen.queryByText('Update available')).toBeNull();
  });

  it('shows nothing on a platform with no row yet', async () => {
    // iOS has no App Store record, so 202611061000 seeds no row for it.
    (api.getLatestRelease as jest.Mock).mockResolvedValue(null);
    await show();
    await waitFor(() => expect(api.getLatestRelease).toHaveBeenCalled());
    expect(screen.queryByText('Update available')).toBeNull();
  });

  it('shows nothing where there is no store at all, and does not ask', async () => {
    (api.storePlatform as jest.Mock).mockReturnValue(null);
    await show();
    expect(screen.queryByText('Update available')).toBeNull();
    // The web build runs this same code and has no store to send anyone to.
    expect(api.getLatestRelease).not.toHaveBeenCalled();
  });

  it('shows nothing when the version strings cannot be compared', async () => {
    (api.installedVersion as jest.Mock).mockReturnValue(null);
    await show();
    await waitFor(() => expect(api.getLatestRelease).toHaveBeenCalled());
    expect(screen.queryByText('Update available')).toBeNull();
  });

  it('Update now opens the listing from the row, not a hardcoded URL', async () => {
    await show();
    fireEvent.press(await screen.findByText('Update now'));
    expect(api.openStoreListing).toHaveBeenCalledWith(PLAY_URL);
  });

  it('leaves the notice up after Update now, so a failed open can be retried', async () => {
    await show();
    fireEvent.press(await screen.findByText('Update now'));
    expect(screen.getByText('Update available')).toBeTruthy();
  });

  it('Dismiss takes it off the screen', async () => {
    await show();
    fireEvent.press(await screen.findByText('Dismiss'));
    await waitFor(() => expect(screen.queryByText('Update available')).toBeNull());
  });
});
