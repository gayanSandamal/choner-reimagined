import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import type { ProofType } from '@/types/database';

type TaskLike = {
  proof_type?: ProofType | null;
};

type ChallengeLike = {
  challenge_templates?: { proof_type?: ProofType | null } | null;
};

// Task override wins, else the template, else 'tap'. Mirrors the SQL
// effective_proof_type() so the client and the database agree.
export function resolveProofType(task?: TaskLike | null, challenge?: ChallengeLike | null): ProofType {
  return task?.proof_type ?? challenge?.challenge_templates?.proof_type ?? 'tap';
}

export type CaptureResult =
  | { status: 'captured'; base64: string }
  | { status: 'cancelled' }
  | { status: 'unavailable' };

// Camera ONLY — deliberately no gallery fallback. The whole point of photo
// proof is that it was taken now, and a library picker would let an old or
// staged shot through, which is exactly what the spec asks us to avoid.
export async function captureProofPhoto(): Promise<CaptureResult> {
  // No camera capture on web; the caller falls back to a plain tap rather than
  // blocking the check-in entirely.
  if (Platform.OS === 'web') return { status: 'unavailable' };

  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Camera needed for this one',
      'This habit is verified with a quick photo for your partner. Allow camera access to check in.'
    );
    return { status: 'cancelled' };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.6,
    base64: true,
    exif: false
  });

  if (result.canceled || !result.assets[0]?.base64) return { status: 'cancelled' };
  return { status: 'captured', base64: result.assets[0].base64 };
}
