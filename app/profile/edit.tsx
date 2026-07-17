import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useProfile, useUpdateProfile, useUploadAvatar } from '@/features/profile/hooks';
import { GOALS, TONES } from '@/features/onboarding/constants';
import { theme } from '@/constants/theme';

// Rows written before the onboarding rewrite store display labels
// ('Move more') or old modes ('solo'). Chips highlight on value or label
// match; an unrecognized legacy value highlights nothing and is only
// replaced when the user actively picks a chip.
function isSelected(option: { value: string; label: string }, stored: string) {
  return option.value === stored || option.label === stored;
}

export default function EditProfileScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const updateMut = useUpdateProfile();
  const uploadMut = useUploadAvatar();

  const [fullName, setFullName] = useState('');
  const [goal, setGoal] = useState<string>('');
  const [tone, setTone] = useState<string>('');

  useEffect(() => {
    if (profileQ.data) {
      setFullName(profileQ.data.full_name ?? '');
      setGoal(profileQ.data.primary_goal ?? '');
      setTone(profileQ.data.accountability_mode ?? '');
    }
  }, [profileQ.data]);

  const onPickAvatar = async () => {
    if (!userId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    try {
      await uploadMut.mutateAsync({
        userId,
        base64: result.assets[0].base64,
        contentType: result.assets[0].mimeType ?? 'image/jpeg',
      });
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    }
  };

  const onSave = async () => {
    if (!userId) return;
    try {
      await updateMut.mutateAsync({
        userId,
        payload: {
          full_name: fullName,
          ...(goal ? { primary_goal: goal } : {}),
          ...(tone ? { accountability_mode: tone } : {}),
        },
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e.message);
    }
  };

  if (profileQ.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Edit profile" onBack={() => router.back()} />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Edit profile" onBack={() => router.back()} />

      <Card style={{ alignItems: 'center', gap: theme.spacing(1) }}>
        <Pressable onPress={onPickAvatar}>
          {profileQ.data?.avatar_url ? (
            <Image
              source={{ uri: profileQ.data.avatar_url }}
              style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: theme.colors.surface2 }}
            />
          ) : (
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: theme.colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <AppText variant="title">+</AppText>
            </View>
          )}
        </Pressable>
        <AppText muted variant="caption">{uploadMut.isPending ? 'Uploading...' : 'Tap to change'}</AppText>
      </Card>

      <Input label="Full name" value={fullName} onChangeText={setFullName} />

      <View style={{ gap: 8 }}>
        <AppText variant="label">Primary goal</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {GOALS.map((g) => (
            <Pressable
              key={g.value}
              onPress={() => setGoal(g.value)}
              style={{
                paddingVertical: 10, paddingHorizontal: 12,
                borderRadius: theme.radius.md,
                backgroundColor: isSelected(g, goal) ? theme.colors.surface2 : theme.colors.surface,
                borderWidth: 1,
                borderColor: isSelected(g, goal) ? theme.colors.primary2 : theme.colors.border,
              }}
            >
              <AppText variant="caption">{g.label}</AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="label">How Choner talks to you</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TONES.map((t) => (
            <Pressable
              key={t.value}
              onPress={() => setTone(t.value)}
              style={{
                paddingVertical: 10, paddingHorizontal: 12,
                borderRadius: theme.radius.md,
                backgroundColor: isSelected(t, tone) ? theme.colors.surface2 : theme.colors.surface,
                borderWidth: 1,
                borderColor: isSelected(t, tone) ? theme.colors.primary2 : theme.colors.border,
              }}
            >
              <AppText variant="caption">{t.label}</AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <Button label={updateMut.isPending ? 'Saving...' : 'Save changes'} onPress={onSave} disabled={updateMut.isPending} />
    </Screen>
  );
}
