import { readFileSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({}) } } }));

import { avatarSource } from './avatars';

const MIGRATION = join(__dirname, '..', 'supabase', 'migrations', '202610291400_avatars_are_not_world_readable.sql');

describe('avatarSource', () => {
  it('takes a stored path as-is — the normal case after 202610291400', () => {
    expect(avatarSource('406e6901-1ec6-4d57-8281-e739cc584686/faces/m003.jpg')).toEqual({
      kind: 'path',
      value: '406e6901-1ec6-4d57-8281-e739cc584686/faces/m003.jpg'
    });
  });

  it('nothing to show stays nothing to show', () => {
    expect(avatarSource(null)).toBeNull();
    expect(avatarSource(undefined)).toBeNull();
    expect(avatarSource('   ')).toBeNull();
  });

  // A row written before the migration, or by a build still running the old
  // upload code. The URL itself is dead now, so the path is recovered from it
  // and signed rather than handed to <Image>.
  it('recovers the path from a public bucket URL', () => {
    const url =
      'https://bkncpybneoqjnkhhchxg.supabase.co/storage/v1/object/public/avatars/406e6901/faces/m003.jpg';
    expect(avatarSource(url)).toEqual({ kind: 'path', value: '406e6901/faces/m003.jpg' });
  });

  it('recovers the path from an expired signed URL, token and all', () => {
    const url =
      'https://bkncpybneoqjnkhhchxg.supabase.co/storage/v1/object/sign/avatars/abc/live-1.jpg?token=ey.stale';
    expect(avatarSource(url)).toEqual({ kind: 'path', value: 'abc/live-1.jpg' });
  });

  it('leaves a URL that is not ours alone', () => {
    expect(avatarSource('https://example.test/face.png')).toEqual({
      kind: 'url',
      value: 'https://example.test/face.png'
    });
  });

  it('does not mistake another bucket for this one', () => {
    const url = 'https://ref.supabase.co/storage/v1/object/sign/checkin-photos/abc/1.jpg?token=x';
    expect(avatarSource(url)).toEqual({ kind: 'url', value: url });
  });
});

// The client only works if the bucket really is private and the column really
// holds a path. Both are migration facts, so assert them against the SQL
// rather than against a comment that can drift.
describe('the migration the client assumes', () => {
  const sql = readFileSync(MIGRATION, 'utf8');

  it('makes the bucket private and drops the unauthenticated read policy', () => {
    expect(sql).toMatch(/update storage\.buckets set public = false where id = 'avatars'/);
    expect(sql).toMatch(/drop policy if exists "avatars_public_read" on storage\.objects/);
  });

  it('replaces it with a policy that requires a session', () => {
    expect(sql).toMatch(/create policy "avatars_signed_in_read"[\s\S]*?for select to authenticated/);
  });

  it('rewrites the stored URLs into paths', () => {
    expect(sql).toContain("split_part(avatar_url, '/storage/v1/object/public/avatars/', 2)");
  });

  // 202609291200's trigger clears the badge on any avatar_url change. The
  // rewrite changes the spelling, not the photo.
  it('keeps the live-photo badge through the rewrite', () => {
    expect(sql).toMatch(/set_config\('choner\.live_photo', 'on', true\)[\s\S]*?update public\.profiles/);
  });
});
