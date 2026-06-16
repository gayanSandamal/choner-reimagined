import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import {
  useGroup,
  useGroupMembers,
  useJoinGroup,
  useLeaveGroup,
  usePosts,
  useCreatePost,
} from '@/features/community/hooks';
import { theme } from '@/constants/theme';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const userId = session?.user.id;

  const groupQ = useGroup(id);
  const membersQ = useGroupMembers(id);
  const postsQ = usePosts(id);
  const join = useJoinGroup();
  const leave = useLeaveGroup();
  const createPost = useCreatePost();

  const isMember = (membersQ.data ?? []).some((m: any) => m.user_id === userId);
  const [body, setBody] = useState('');

  const onPost = async () => {
    if (!userId || !id || !body.trim()) return;
    try {
      await createPost.mutateAsync({ userId, groupId: id, body: body.trim() });
      setBody('');
    } catch (e: any) {
      Alert.alert('Could not post', e.message);
    }
  };

  if (groupQ.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Group" onBack={() => router.back()} />
        <LoadingState />
      </Screen>
    );
  }
  if (groupQ.isError || !groupQ.data) {
    return (
      <Screen>
        <ScreenHeader title="Group" onBack={() => router.back()} />
        <ErrorState onRetry={() => groupQ.refetch()} />
      </Screen>
    );
  }

  const g = groupQ.data;

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}
        refreshControl={<RefreshControl refreshing={postsQ.isRefetching} onRefresh={() => { postsQ.refetch(); membersQ.refetch(); }} tintColor={theme.colors.primary} />}
      >
        <ScreenHeader title={g.title} onBack={() => router.back()} />

        <Card style={{ gap: 6 }}>
          {g.description ? <AppText muted>{g.description}</AppText> : null}
          <AppText variant="caption" muted>
            {(membersQ.data ?? []).length} member{(membersQ.data ?? []).length === 1 ? '' : 's'} • {g.visibility ?? 'public'}
          </AppText>
          {isMember ? (
            <Button
              label={leave.isPending ? 'Leaving...' : 'Leave group'}
              variant="ghost"
              onPress={() =>
                Alert.alert('Leave this group?', 'You can rejoin later.', [
                  { text: 'Cancel' },
                  { text: 'Leave', style: 'destructive', onPress: () => userId && leave.mutate({ groupId: id!, userId }) },
                ])
              }
            />
          ) : (
            <Button
              label={join.isPending ? 'Joining...' : 'Join group'}
              onPress={() => userId && join.mutate({ groupId: id!, userId })}
            />
          )}
        </Card>

        {isMember ? (
          <Card style={{ gap: theme.spacing(1) }}>
            <AppText variant="label">Share an update</AppText>
            <Input
              value={body}
              onChangeText={setBody}
              placeholder="What's working today?"
              multiline
              numberOfLines={3}
              style={{ minHeight: 80 }}
            />
            <Button
              label={createPost.isPending ? 'Posting...' : 'Post'}
              onPress={onPost}
              disabled={createPost.isPending || !body.trim()}
            />
          </Card>
        ) : null}

        <AppText variant="label" muted style={{ paddingLeft: theme.spacing(1) }}>Posts</AppText>
        {postsQ.isLoading ? (
          <LoadingState />
        ) : (postsQ.data ?? []).length === 0 ? (
          <EmptyState title="No posts yet" body={isMember ? 'Share your first update above.' : 'Join the group to start posting.'} />
        ) : (
          (postsQ.data ?? []).map((p: any) => (
            <Card key={p.id} onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}>
              <AppText variant="label">{p.profiles?.full_name ?? 'Member'}</AppText>
              <AppText muted numberOfLines={4}>{p.body}</AppText>
            </Card>
          ))
        )}

        <AppText variant="label" muted style={{ paddingLeft: theme.spacing(1) }}>Members</AppText>
        {(membersQ.data ?? []).map((m: any) => (
          <View key={m.id} style={{ paddingHorizontal: theme.spacing(1), paddingVertical: 6 }}>
            <AppText variant="caption">{m.profiles?.full_name ?? 'Member'} {m.role === 'admin' ? '• admin' : ''}</AppText>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
