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
import { theme } from '@/constants/theme';

const goals = ['Move more', 'Sleep better', 'Reduce stress', 'Improve energy'];
const modes = ['solo', 'partner', 'group', 'public'];

export default function EditProfileScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const updateMut = useUpdateProfile();
  const uploadMut = useUploadAvatar();

  const [fullName, setFullName] = useState('');
  const [goal, setGoal] = useState(goals[0]);
  const [mode, setMode] = useState('solo');

  useEffect(() => {
    if (profileQ.data) {
      setFullName(profileQ.data.full_name ?? '');
      setGoal(profileQ.data.primary_goal ?? goals[0]);
      setMode(profileQ.data.accountability_mode ?? 'solo');
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
        payload: { full_name: fullName, primary_goal: goal, accountability_mode: mode },
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
          {goals.map((g) => (
            <Pressable
              key={g}
              onPress={() => setGoal(g)}
              style={{
                paddingVertical: 10, paddingHorizontal: 12,
                borderRadius: theme.radius.md,
                backgroundColor: g === goal ? theme.colors.surface2 : theme.colors.surface,
                borderWidth: 1,
                borderColor: g === goal ? theme.colors.primary2 : theme.colors.border,
              }}
            >
              <AppText variant="caption">{g}</AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="label">Accountability mode</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {modes.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={{
                paddingVertical: 10, paddingHorizontal: 12,
                borderRadius: theme.radius.md,
                backgroundColor: m === mode ? theme.colors.surface2 : theme.colors.surface,
                borderWidth: 1,
                borderColor: m === mode ? theme.colors.primary2 : theme.colors.border,
              }}
            >
              <AppText variant="caption">{m}</AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <Button label={updateMut.isPending ? 'Saving...' : 'Save changes'} onPress={onSave} disabled={updateMut.isPending} />
    </Screen>
  );
}
