import { useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';
import { useSession } from '@/providers/session-provider';
import { useUploadLivePhoto } from '@/features/profile/hooks';
import { getMyChallenge, partnerStateOf } from '@/features/challenges/api';
import { acceptInvite } from '@/features/community/api';
import { clearPendingInviteToken, getPendingInviteToken } from '@/lib/pending-invite';

// One optional screen after the reveal.
//
// Live camera only, and there is no gallery import anywhere in this flow: a
// live capture is the only thing that stops someone reusing a photo of
// somebody else. It does not stop an irrelevant photo, and none of the copy
// here claims it does.
//
// The badge says "Photo confirmed", never "verified". Locked 2026-09-21.
// Choner checks that the photo was taken live, not who is in it, and two
// strangers are going to meet in person on the strength of it.
export default function PhotoScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { session } = useSession();
  const userId = session?.user.id;
  const uploadLivePhoto = useUploadLivePhoto();
  const [shot, setShot] = useState<{ uri: string; base64: string } | null>(null);
  const uri = shot?.uri ?? null;
  const [busy, setBusy] = useState(false);

  // Someone who came in on an invite inherits their partner's challenge, so
  // the picker and the partner choice would both be asking a question that is
  // already answered: they go straight to the why and finish on Home.
  //
  // The invite is normally accepted in the background the moment the quiz
  // saves (PendingInviteHandler in app/_layout.tsx). If that has not happened
  // yet the token is still in storage, so it is accepted here rather than
  // letting the person pick a challenge the acceptance would then overwrite.
  const next = async () => {
    let joined = false;
    try {
      const token = await getPendingInviteToken();
      if (token) {
        try {
          await acceptInvite(token);
        } finally {
          // A dead token must not be retried on every launch.
          await clearPendingInviteToken();
        }
      }
      if (userId) {
        const mine = await getMyChallenge(userId);
        joined = partnerStateOf(mine) === 'partnered';
      }
    } catch {
      // Fall through to the picker: a failed lookup must not trap onboarding.
    }
    if (joined) router.replace('/challenge/why');
    else router.push('/onboarding/challenge');
  };

  const onTake = async () => {
    try {
      setBusy(true);
      const taken = await cameraRef.current?.takePictureAsync({ quality: 0.7, base64: true });
      if (taken?.uri && taken.base64) setShot({ uri: taken.uri, base64: taken.base64 });
    } catch (error: any) {
      notify('Could not take the photo', error.message);
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    if (!shot || !userId) return;
    try {
      setBusy(true);
      // Upload first, continue second: the badge on this screen is a promise
      // about what is stored, so it must not be shown for a photo that failed
      // to save. set_live_photo() is what marks it photo_confirmed.
      await uploadLivePhoto.mutateAsync({ userId, base64: shot.base64 });
      await next();
    } catch (error: any) {
      notify('Could not save your photo', error.message);
    } finally {
      setBusy(false);
    }
  };

  // Nothing to write: photo_status defaults to 'no_photo', which is what lets
  // Profile offer "Add your photo" rather than "Retake your photo".
  const onSkip = () => {
    next();
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.header}>
          <AppText variant="label" muted>
            Your profile
          </AppText>
          <AppText variant="title">
            Add your{' '}
            <AppText variant="title" style={styles.titleBold}>
              photo
            </AppText>
          </AppText>
          <AppText variant="caption" muted>
            Take it live with your camera. Photos from your gallery can't be used.
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(360)}>
          {uri ? (
            <View style={styles.confirmed}>
              <Image source={{ uri }} style={styles.preview} />
              <View style={styles.badge}>
                <Icon name="check" size={13} color={theme.colors.success} strokeWidth={3} />
                <AppText style={styles.badgeLabel}>Photo confirmed</AppText>
              </View>
            </View>
          ) : permission?.granted ? (
            <View style={styles.cameraBox}>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
              <View style={styles.faceGuide} pointerEvents="none" />
              <AppText style={styles.cameraCaption}>Live camera</AppText>
            </View>
          ) : (
            <View style={[styles.cameraBox, styles.cameraOff]}>
              <Icon name="camera" size={30} color={theme.colors.muted} />
              <AppText variant="caption" muted style={styles.cameraOffCopy}>
                {permission
                  ? 'Choner needs your camera to take this photo.'
                  : 'Checking your camera…'}
              </AppText>
              <Button label="Allow camera" variant="outline" onPress={() => requestPermission()} />
            </View>
          )}
        </Animated.View>

        {uri ? null : (
          <Animated.View entering={FadeInDown.delay(200).duration(360)} style={styles.note}>
            <View style={styles.badge}>
              <Icon name="check" size={13} color={theme.colors.success} strokeWidth={3} />
              <AppText style={styles.badgeLabel}>Photo confirmed</AppText>
            </View>
            <AppText variant="caption" muted style={styles.noteCopy}>
              A photo earns this badge on your profile, so a match can see you are a real person.
              You can retake it any time in Profile.
            </AppText>
          </Animated.View>
        )}
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(280).duration(360)} style={styles.footer}>
        {uri ? (
          <>
            <Button label="Continue" loading={busy} disabled={busy} onPress={onConfirm} />
            <Button label="Retake" variant="ghost" disabled={busy} onPress={() => setShot(null)} />
          </>
        ) : (
          <>
            <Button
              label="Take photo"
              loading={busy}
              disabled={!permission?.granted || busy}
              onPress={onTake}
            />
            <Button label="Set up later" variant="ghost" onPress={onSkip} />
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 20, paddingTop: theme.spacing(2), gap: theme.spacing(2.5), flexGrow: 1 },
  header: { gap: theme.spacing(1) },
  titleBold: { fontFamily: theme.fonts.bodyBold },
  cameraBox: {
    height: 250,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.navy,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cameraOff: { backgroundColor: theme.colors.surface3, gap: theme.spacing(1.5), padding: 20 },
  cameraOffCopy: { textAlign: 'center' },
  faceGuide: {
    position: 'absolute',
    width: 120,
    height: 150,
    top: 40,
    borderRadius: 75,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.45)'
  },
  cameraCaption: {
    position: 'absolute',
    bottom: 16,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)'
  },
  confirmed: {
    height: 250,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1.5)
  },
  preview: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#FFFFFF'
  },
  note: { alignItems: 'center', gap: theme.spacing(1) },
  noteCopy: { textAlign: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: '#E3F4EA'
  },
  badgeLabel: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 11.5,
    color: theme.colors.success
  },
  footer: { padding: 20, paddingTop: theme.spacing(1), gap: theme.spacing(1) }
});
