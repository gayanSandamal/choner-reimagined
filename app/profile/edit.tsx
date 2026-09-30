import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useProfile, useUpdateProfile, useUploadAvatar } from '@/features/profile/hooks';
import {
  AGE_BANDS,
  AgeRangeValue,
  GENDERS,
  GenderValue,
  GOALS,
  STRUGGLES,
  TONES
} from '@/features/onboarding/constants';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

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
  const [struggle, setStruggle] = useState<string>('');
  const [ageRange, setAgeRange] = useState<AgeRangeValue | ''>('');
  const [gender, setGender] = useState<GenderValue | ''>('');

  useEffect(() => {
    if (profileQ.data) {
      setFullName(profileQ.data.full_name ?? '');
      setGoal(profileQ.data.primary_goal ?? '');
      setTone(profileQ.data.accountability_mode ?? '');
      setStruggle(profileQ.data.main_struggle ?? '');
      setAgeRange(profileQ.data.age_range ?? '');
      setGender(profileQ.data.gender ?? '');
    }
  }, [profileQ.data]);

  const onPickAvatar = async () => {
    if (!userId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify('Permission needed', 'Please allow photo library access to change your avatar.');
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
      notify('Upload failed', e.message);
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
          // TODO(gayan-tone-column): `accountability_mode` is holding the TONE
          // value, which is not an accountability mode, and it still defaults
          // to 'solo' — a mode that no longer exists. When his task 5 splits
          // the column, this write and the one in app/onboarding/energy.tsx
          // (lines 34-51, the single write that saves the whole quiz) have to
          // change together, or onboarding keeps writing the old shape.
          ...(tone ? { accountability_mode: tone } : {}),
          ...(struggle ? { main_struggle: struggle } : {}),
          ...(ageRange ? { age_range: ageRange } : {}),
          ...(gender ? { gender: gender } : {}),
        },
      });
      router.back();
    } catch (e: any) {
      notify('Save failed', e.message);
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
            <Chip
              key={g.value}
              label={g.label}
              active={isSelected(g, goal)}
              onPress={() => setGoal(g.value)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="label">How Choner talks to you</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TONES.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              active={isSelected(t, tone)}
              onPress={() => setTone(t.value)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="label">What stops you</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {STRUGGLES.map((s) => (
            <Chip
              key={s.value}
              label={s.label}
              active={isSelected(s, struggle)}
              onPress={() => setStruggle(s.value)}
            />
          ))}
        </View>
      </View>

      {/* Age and gender are here because matching depends on them: gender
          drives the "same gender only" filter and the age band feeds the
          scoring. Without a way to correct them, a mistyped answer at
          onboarding would follow someone forever. */}
      <View style={{ gap: 8 }}>
        <AppText variant="label">Your age</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {AGE_BANDS.map((a) => (
            <Chip
              key={a.value}
              label={a.label}
              active={ageRange === a.value}
              onPress={() => setAgeRange(a.value)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="label">Your gender</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {GENDERS.map((g) => (
            <Chip
              key={g.value}
              label={g.label}
              active={gender === g.value}
              onPress={() => setGender(g.value)}
            />
          ))}
        </View>
      </View>

      {/* Energy is deliberately absent. It asks how you are feeling THIS week,
          so it is re-asked rather than edited. */}

      <Button label={updateMut.isPending ? 'Saving...' : 'Save changes'} onPress={onSave} disabled={updateMut.isPending} />
    </Screen>
  );
}
