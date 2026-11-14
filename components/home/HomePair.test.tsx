import { render, screen } from '@testing-library/react-native';
import { HomePair } from './HomePair';
import { pairMarkState } from './PairMark';

// The pair card on Home, which replaced the heart on 14 Nov 2026.

describe('pairMarkState', () => {
  it('shows your circle alone, searching, or with your partner', () => {
    expect(pairMarkState(false, 'none')).toBe('alone');
    expect(pairMarkState(false, 'finding')).toBe('searching');
    // Waiting on an invite: someone is on the way, as with a search.
    expect(pairMarkState(false, 'invited')).toBe('searching');
    expect(pairMarkState(true, 'matched')).toBe('paired');
  });
});

describe('HomePair', () => {
  it('reads "You + ?" before a partner, with no session dots', async () => {
    await render(<HomePair partnerName={null} partnerState="finding" sessionsTogether={0} />);
    expect(screen.getByText('You + ?')).toBeTruthy();
    expect(screen.getByText('Searching for your partner.')).toBeTruthy();
  });

  it('names the partner and counts sessions together', async () => {
    await render(<HomePair partnerName="Gayan" partnerState="matched" sessionsTogether={3} />);
    expect(screen.getByText('You + Gayan')).toBeTruthy();
    expect(screen.getByText('3 sessions together')).toBeTruthy();
    expect(screen.getByLabelText('You + Gayan. 3 sessions together. You both showed up 3 times.')).toBeTruthy();
  });
});
