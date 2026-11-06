import type { ReactElement } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CustomTabBar } from './CustomTabBar';
import { renderWithProviders } from '@/test/render';

// The bar reads useSafeAreaInsets() for how far to float above the home
// indicator, and the shared helper provides no safe area. Fixed metrics, so
// nothing here depends on a device.
const METRICS = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 }
};

const show = (ui: ReactElement) =>
  renderWithProviders(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);

// What this covers: that pressing a tab reaches expo-router through the props
// expo-router ACTUALLY passes.
//
// It exists because of a crash, not for completeness. Up to SDK 57 the tabBar
// render prop was handed a `navigation` object; expo-router 58.0.28 replaced
// it with `emitter` and `navigateToTab(routeKey)` and passes no `navigation`
// at all. The bar destructured `navigation`, got undefined, and threw "Cannot
// read properties of undefined (reading 'emit')" on the first tab press. The
// bar still DREW correctly, because `state` survived the change, so nothing
// caught it until a device froze.
//
// The props below are the real SDK 58 shape. If expo-router moves it again,
// the `as any` is gone from app/(tabs)/_layout.tsx so tsc fails first, and
// this fails second.

jest.mock('@/lib/haptics', () => ({
  haptics: { selection: jest.fn() }
}));

const state = {
  index: 0,
  routes: [
    { key: 'home-1', name: 'home' },
    { key: 'challenges-1', name: 'challenges' },
    { key: 'find-1', name: 'find' },
    { key: 'community-1', name: 'community' },
    { key: 'profile-1', name: 'profile' }
  ]
};

const setup = (over: { index?: number } = {}) => {
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const navigateToTab = jest.fn();
  return {
    emit,
    navigateToTab,
    render: () =>
      show(
        <CustomTabBar
          state={{ ...state, index: over.index ?? 0 }}
          emitter={{ emit }}
          navigateToTab={navigateToTab}
        />
      )
  };
};

describe('CustomTabBar', () => {
  it('announces the press and navigates by route KEY, not name', async () => {
    const { emit, navigateToTab, render } = setup();
    await render();

    fireEvent.press(screen.getByLabelText('Find'));

    expect(emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'find-1',
      canPreventDefault: true
    });
    // navigateToTab takes the key. Passing the name navigates nowhere.
    expect(navigateToTab).toHaveBeenCalledWith('find-1');
  });

  it('does not navigate to the tab already showing', async () => {
    const { emit, navigateToTab, render } = setup({ index: 0 });
    await render();

    fireEvent.press(screen.getByLabelText('Home'));

    expect(emit).toHaveBeenCalled();
    expect(navigateToTab).not.toHaveBeenCalled();
  });

  it('lets a screen prevent the move', async () => {
    const emit = jest.fn(() => ({ defaultPrevented: true }));
    const navigateToTab = jest.fn();
    await show(<CustomTabBar state={state} emitter={{ emit }} navigateToTab={navigateToTab} />);

    fireEvent.press(screen.getByLabelText('Community'));

    expect(navigateToTab).not.toHaveBeenCalled();
  });

  it('survives a prop shape it does not recognise instead of throwing', async () => {
    // The whole point of the crash: an absent prop must degrade, not explode.
    await show(<CustomTabBar state={state} />);

    expect(() => fireEvent.press(screen.getByLabelText('Find'))).not.toThrow();
  });
});
