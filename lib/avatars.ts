import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Turning what `profiles.avatar_url` holds into something an <Image> can load.
 *
 * The `avatars` bucket is private (202610291400), so there is no public URL
 * any more and the column holds a storage path. Every render has to sign, the
 * same habit getCheckinPhotoUrl() already has for check-in photos — and for
 * the same reason, the expiry is short: a signature that outlives the view it
 * was made for is a URL that outlives a deleted account.
 *
 * Two things this adds over calling createSignedUrl() at each call site.
 *
 * ONE SIGNING CALL PER TICK. Who else lists a whole directory and the city
 * feed is a page of faces; a request each would be fifty round trips to show
 * one screen. Paths asked for in the same tick go out together through
 * createSignedUrls().
 *
 * A CACHE KEYED BY PATH. The sample pool shares 100 files across 1,470
 * profiles, so the same path turns up many times on one screen and again on
 * the next. Signatures are reused until they are close to expiring.
 */

const BUCKET = 'avatars';
const TTL_SECONDS = 60 * 10;
// Stop handing out a signature in its last minute: the image still has to be
// fetched after the component renders it.
const EXPIRY_MARGIN_MS = 60_000;

const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;
const SIGNED_MARKER = `/storage/v1/object/sign/${BUCKET}/`;
const AUTHED_MARKER = `/storage/v1/object/${BUCKET}/`;

type Source = { kind: 'path'; value: string } | { kind: 'url'; value: string };

/**
 * What a stored value actually is. A path is the normal case. A URL turns up
 * two ways: a row written before 202610291400 rewrote them, or a build still
 * running the old upload code. Both point into this bucket, so the path is
 * recovered and signed rather than passed through — an unsigned URL would
 * just 400 now. Anything else keeps its URL, since it is not ours to rewrite.
 */
export function avatarSource(value: string | null | undefined): Source | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return { kind: 'path', value: trimmed };

  for (const marker of [PUBLIC_MARKER, SIGNED_MARKER, AUTHED_MARKER]) {
    const at = trimmed.indexOf(marker);
    if (at === -1) continue;
    const path = trimmed.slice(at + marker.length).split('?')[0];
    if (path) return { kind: 'path', value: decodeURIComponent(path) };
  }
  return { kind: 'url', value: trimmed };
}

const cache = new Map<string, { url: string; expiresAt: number }>();

function cached(path: string) {
  const hit = cache.get(path);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(path);
    return null;
  }
  return hit.url;
}

const inflight = new Map<string, Promise<string | null>>();
const waiting = new Map<string, ((url: string | null) => void)[]>();
let batch: string[] = [];
let scheduled = false;

async function flush() {
  scheduled = false;
  const paths = batch;
  batch = [];
  if (paths.length === 0) return;

  const signed = new Map<string, string>();
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, TTL_SECONDS);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.signedUrl && !row.error && row.path) signed.set(row.path, row.signedUrl);
    }
  } catch {
    // A signature that cannot be made is a face that cannot be shown, which
    // Avatar already has an answer for: the initials gradient. Never a throw —
    // this runs during render of screens that have nothing else wrong.
  }

  const expiresAt = Date.now() + TTL_SECONDS * 1000 - EXPIRY_MARGIN_MS;
  for (const path of paths) {
    const url = signed.get(path) ?? null;
    if (url) cache.set(path, { url, expiresAt });
    inflight.delete(path);
    for (const resolve of waiting.get(path) ?? []) resolve(url);
    waiting.delete(path);
  }
}

/** A signed URL for one path, batched with everything else asked for this tick. */
export function signAvatarPath(path: string): Promise<string | null> {
  const hit = cached(path);
  if (hit) return Promise.resolve(hit);

  const pending = inflight.get(path);
  if (pending) return pending;

  const promise = new Promise<string | null>((resolve) => {
    waiting.set(path, [...(waiting.get(path) ?? []), resolve]);
    batch.push(path);
  });
  inflight.set(path, promise);
  if (!scheduled) {
    scheduled = true;
    setTimeout(flush, 0);
  }
  return promise;
}

/**
 * A loadable URL for whatever `profiles.avatar_url` (or an RPC's avatar field)
 * handed over. Null while a signature is being fetched and null when there is
 * nothing to show, which the caller renders the same way either side of it.
 */
export function useAvatarUri(value: string | null | undefined): string | null {
  const source = useMemo(() => avatarSource(value), [value]);
  const [uri, setUri] = useState<string | null>(() =>
    source === null ? null : source.kind === 'url' ? source.value : cached(source.value)
  );

  useEffect(() => {
    if (source === null) {
      setUri(null);
      return;
    }
    if (source.kind === 'url') {
      setUri(source.value);
      return;
    }
    const hit = cached(source.value);
    if (hit) {
      setUri(hit);
      return;
    }
    // Drop the previous person's face while the next one is signed, rather
    // than showing the wrong one for a frame.
    setUri(null);
    let alive = true;
    signAvatarPath(source.value).then((signed) => {
      if (alive) setUri(signed);
    });
    return () => {
      alive = false;
    };
  }, [source]);

  return uri;
}

/** Tests only: signatures are process-global, so a suite has to be able to drop them. */
export function __clearAvatarCache() {
  cache.clear();
  inflight.clear();
  waiting.clear();
  batch = [];
}
