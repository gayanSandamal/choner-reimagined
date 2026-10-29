import { readFileSync } from 'fs';
import { join } from 'path';

// The live-photo badge is enforced entirely in SQL and in an edge function.
// There is no pure-logic module to test, so these read the migration and the
// function and assert the properties the badge's meaning rests on — the same
// approach features/safety/rules.test.ts takes with the blocking rules.
//
// If one of these fails, the badge has quietly started meaning something
// weaker than "the bytes came through our server".

const migrations = join(__dirname, '../../supabase/migrations');

const photoStatus = readFileSync(join(migrations, '202609291200_photo_status.sql'), 'utf8');
const avatarsPrivate = readFileSync(
  join(migrations, '202610291400_avatars_are_not_world_readable.sql'),
  'utf8'
);
const serverOnly = readFileSync(
  join(migrations, '202610291600_a_live_photo_comes_from_the_server.sql'),
  'utf8'
);
const edgeFunction = readFileSync(
  join(__dirname, '../../supabase/functions/submit-live-photo/index.ts'),
  'utf8'
);

describe('only the server can award the badge', () => {
  it('leaves no client-callable way to set photo_confirmed', () => {
    // The old entry point is gone, not merely revoked: a function nothing can
    // call is a trap for whoever reads this next.
    expect(serverOnly).toMatch(/drop function if exists public\.set_live_photo\(text\);/);
    // And its replacement is reachable by the service role alone.
    expect(serverOnly).toMatch(
      /revoke all on function public\.set_live_photo_for\(uuid, text\) from public, anon, authenticated;/
    );
    expect(serverOnly).toMatch(
      /grant execute on function public\.set_live_photo_for\(uuid, text\) to service_role;/
    );
    expect(serverOnly).not.toMatch(
      /grant execute on function public\.set_live_photo_for\(uuid, text\) to authenticated/
    );
  });

  it('refuses a path outside the server-only prefix', () => {
    expect(serverOnly).toContain("split_part(p_path, '/', 2) is distinct from 'live'");
    // Still the user it is awarded to, as 202610291400 established.
    expect(serverOnly).toContain('public.storage_owner_uuid(p_path) is distinct from p_uid');
  });

  it('requires the object to exist and to be fresh', () => {
    // Without the existence check the badge could be earned with no image at
    // all; without freshness, by re-awarding a path from months back.
    expect(serverOnly).toMatch(/from storage\.objects o\s*\n\s*where o\.bucket_id = 'avatars' and o\.name = p_path/);
    expect(serverOnly).toContain("raise exception 'no such live photo'");
    expect(serverOnly).toContain("v_written < now() - interval '5 minutes'");
  });
});

describe('the server-only prefix is actually closed', () => {
  it('blocks client insert AND update, so bytes cannot be pre-placed or swapped', () => {
    for (const cmd of ['insert', 'update']) {
      expect(serverOnly).toMatch(
        new RegExp(`as restrictive for ${cmd} to authenticated`)
      );
    }
    // Restrictive, so it ANDs with the owner-only policies rather than
    // replacing them. A permissive policy here would grant, not subtract.
    expect(serverOnly).not.toMatch(/as permissive for (insert|update)/);
  });

  it('does not restrict select, which every avatar render needs', () => {
    expect(serverOnly).not.toMatch(/as restrictive for select/);
  });
});

describe('the badge still claims only what it can prove', () => {
  // The prose in these files says the word "verified" in order to forbid it
  // ("never 'verified'. Locked 2026-09-21"), so the check has to be against
  // what actually executes.
  const code = (text: string) =>
    text
      .split('\n')
      .filter((line) => !/^\s*(--|\/\/)/.test(line))
      .join('\n');

  it('is never called verified in anything that executes', () => {
    for (const source of [photoStatus, avatarsPrivate, serverOnly, edgeFunction]) {
      expect(code(source)).not.toMatch(/'verified'/);
      expect(code(source)).not.toMatch(/photo_verified/);
    }
    expect(serverOnly).toContain('photo_confirmed');
  });

  it('still allows exactly the two statuses', () => {
    expect(photoStatus).toContain("check (photo_status in ('photo_confirmed', 'no_photo'))");
  });

  it('says in the function what it does not prove', () => {
    // The honest ceiling, kept next to the code rather than in a PR nobody
    // re-reads: server-written bytes, not a proven live human.
    expect(edgeFunction).toMatch(/does NOT prove a real face/i);
  });

  it('keeps the rule that a gallery change drops the badge', () => {
    // 202609291200's trigger is what makes the badge unable to outlive the
    // photo that earned it. Nothing here may remove it.
    expect(photoStatus).toContain('profiles_reset_photo_status');
    expect(serverOnly).not.toMatch(/drop trigger[^\n]*profiles_reset_photo_status/);
    // The new awarder must still set the flag that trigger looks for.
    expect(serverOnly).toContain("set_config('choner.live_photo', 'on', true)");
  });
});

describe('the edge function validates what it stores', () => {
  it('takes the user from the verified token, never the body', () => {
    expect(edgeFunction).toContain('admin.auth.getUser(jwt)');
    expect(edgeFunction).toContain('const uid = auth.user.id;');
    // The body carries image bytes and nothing else.
    expect(edgeFunction).not.toMatch(/body[\s\S]{0,40}\buser_?id\b/i);
  });

  it('writes only into the prefix the policies reserve', () => {
    expect(edgeFunction).toContain('`${uid}/live/${Date.now()}.jpg`');
    expect(edgeFunction).toContain('upsert: false');
  });

  it('does not leave an orphan object when the award fails', () => {
    expect(edgeFunction).toMatch(/if \(awardError\)[\s\S]{0,200}remove\(\[path\]\)/);
  });
});
