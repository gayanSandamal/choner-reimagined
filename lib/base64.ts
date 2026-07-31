// Shared by every image upload path (avatars, check-in photos). Supabase
// storage wants bytes, but the camera and image picker hand back base64.
export function decodeBase64(b64: string): Uint8Array {
  // React Native global atob is available via the URL polyfill bundle.
  const binary = globalThis.atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
