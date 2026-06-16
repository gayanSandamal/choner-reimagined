import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useComments, useCreateComment, usePost, useReactToPost, useReportContent } from '@/features/community/hooks';
import { theme } from '@/constants/theme';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const userId = session?.user.id;

  const postQ = usePost(id);
  const commentsQ = useComments(id);
  const commentMut = useCreateComment();
  const reactMut = useReactToPost();
  const reportMut = useReportContent();
  const [body, setBody] = useState('');

  const onComment = async () => {
    if (!userId || !id || !body.trim()) return;
    try {
      await commentMut.mutateAsync({ postId: id, userId, body: body.trim() });
      setBody('');
    } catch (e: any) {
      Alert.alert('Could not comment', e.message);
    }
  };

  const onReport = () => {
    if (!userId || !id) return;
    Alert.alert(
      'Report this post?',
      'A moderator will review it.',
      [
        { text: 'Cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => reportMut.mutate({ reporterId: userId, targetKind: 'post', targetId: id, reason: 'inappropriate' }),
        },
      ]
    );
  };

  if (postQ.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Post" onBack={() => router.back()} />
        <LoadingState />
      </Screen>
    );
  }
  if (postQ.isError || !postQ.data) {
    return (
      <Screen>
        <ScreenHeader title="Post" onBack={() => router.back()} />
        <ErrorState onRetry={() => postQ.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}
        refreshControl={<RefreshControl refreshing={commentsQ.isRefetching} onRefresh={() => commentsQ.refetch()} tintColor={theme.colors.primary} />}
      >
        <ScreenHeader title="Post" onBack={() => router.back()} />

        <Card style={{ gap: theme.spacing(1) }}>
          <AppText variant="label">{(postQ.data as any).profiles?.full_name ?? 'Member'}</AppText>
          <AppText>{(postQ.data as any).body}</AppText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button
              label="Cheer"
              variant="secondary"
              onPress={() => userId && reactMut.mutate({ postId: id!, userId })}
              style={{ flex: 1 }}
            />
            <Button label="Report" variant="ghost" onPress={onReport} />
          </View>
        </Card>

        <Card style={{ gap: theme.spacing(1) }}>
          <AppText variant="label">Add a comment</AppText>
          <Input
            value={body}
            onChangeText={setBody}
            placeholder="Encourage them..."
            multiline
            numberOfLines={2}
            style={{ minHeight: 60 }}
          />
          <Button
            label={commentMut.isPending ? 'Posting...' : 'Post comment'}
            onPress={onComment}
            disabled={commentMut.isPending || !body.trim()}
          />
        </Card>

        <AppText variant="label" muted style={{ paddingLeft: theme.spacing(1) }}>Comments</AppText>
        {commentsQ.isLoading ? (
          <LoadingState />
        ) : (commentsQ.data ?? []).length === 0 ? (
          <EmptyState title="No comments yet" body="Be the first to leave a note." />
        ) : (
          (commentsQ.data ?? []).map((c: any) => (
            <Card key={c.id}>
              <AppText variant="label">{c.profiles?.full_name ?? 'Member'}</AppText>
              <AppText muted>{c.body}</AppText>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
