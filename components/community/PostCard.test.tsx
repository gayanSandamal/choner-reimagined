import { fireEvent, render, screen } from '@testing-library/react-native';
import { PostCard, type PostCardData } from './PostCard';

const base: PostCardData = {
  kind: 'photo',
  photo_url: 'https://example.com/p.jpg',
  body: 'Sunrise at the park.',
  background: 'orange',
  activity_key: 'walking',
  sessions_together: 5,
  created_at: new Date().toISOString(),
  author_name: 'Nimali',
  author_avatar: null,
  is_mine: false,
  is_partner: false,
  claps: 3,
  i_clapped: false
};

describe('PostCard', () => {
  it('shows a photo post: the activity, the day, the name, the line, who it was with', async () => {
    await render(<PostCard post={base} height={286} onClap={jest.fn()} onMore={jest.fn()} />);
    expect(screen.getByText('Walking')).toBeTruthy();
    expect(screen.getByText('Day 5')).toBeTruthy();
    expect(screen.getByText('Nimali')).toBeTruthy();
    expect(screen.getByText('Sunrise at the park.')).toBeTruthy();
    expect(screen.getByText(/Walking with their partner/)).toBeTruthy();
    // Only the poster is named, never their partner.
    expect(screen.queryByText(/ and /)).toBeNull();
  });

  it('shows a words-only post as the words themselves', async () => {
    await render(<PostCard post={{ ...base, kind: 'text', photo_url: null, body: 'Show up.' }} height={286} />);
    expect(screen.getByText('“Show up.”')).toBeTruthy();
  });

  it('says "with you" on your partner\'s post', async () => {
    await render(<PostCard post={{ ...base, is_partner: true }} height={286} />);
    expect(screen.getByText(/Walking with you/)).toBeTruthy();
  });

  it('claps, and opens the menu', async () => {
    const onClap = jest.fn();
    const onMore = jest.fn();
    await render(<PostCard post={base} height={286} onClap={onClap} onMore={onMore} />);
    expect(screen.getByText('3')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Clap for this'));
    expect(onClap).toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Post options'));
    expect(onMore).toHaveBeenCalled();
  });
});
