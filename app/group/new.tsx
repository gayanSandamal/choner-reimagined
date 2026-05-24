import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useSession } from '@/providers/session-provider';
import { useCreateGroup } from '@/features/community/hooks';
import { theme } from '@/constants/theme';

export default function NewGroupScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const createMut = useCreateGroup();

  const onSubmit = async () => {
    if (!userId || !title.trim()) return;
    try {
      const g = await createMut.mutateAsync({ userId, title: title.trim(), description: description.trim() || undefined, visibility });
      router.replace({ pathname: '/group/[id]', params: { id: g.id } });
    } catch (e: any) {
      Alert.alert('Could not create', e.message);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="New group" onBack={() => router.back()} />

      <Input label="Group name" value={title} onChangeText={setTitle} placeholder="Morning Movement Crew" />
      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Who is this group for and what does it focus on?"
        multiline
        numberOfLines={3}
        style={{ minHeight: 80 }}
      />

      <Card style={{ gap: 8 }}>
        <AppText variant="label">Visibility</AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['public', 'private'] as const).map((v) => (
            <Button
              key={v}
              label={v[0].toUpperCase() + v.slice(1)}
              variant={visibility === v ? 'primary' : 'secondary'}
              onPress={() => setVisibility(v)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
        <AppText variant="caption" muted>
          {visibility === 'public'
            ? 'Anyone can find and join this group.'
            : 'Only invited members can see this group.'}
        </AppText>
      </Card>

      <Button
        label={createMut.isPending ? 'Creating...' : 'Create group'}
        onPress={onSubmit}
        disabled={createMut.isPending || !title.trim()}
        style={{ marginTop: theme.spacing(1) }}
      />
    </Screen>
  );
}
