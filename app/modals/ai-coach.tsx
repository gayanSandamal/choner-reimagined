import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useActiveConversation, useAIMessages, useSendAIMessage, useTodayAICount } from '@/features/ai/hooks';
import { useIsPremium } from '@/features/billing/hooks';
import { theme } from '@/constants/theme';
import { confirmAction, notify } from '@/lib/alert';

const PROMPTS = [
  "I missed 3 days, help me restart",
  "Make my challenge easier",
  "Why do I lose consistency on weekends?",
];

const FREE_DAILY_LIMIT = 5;

export default function AiCoachModal() {
  const { session } = useSession();
  const userId = session?.user.id;

  const convQ = useActiveConversation(userId);
  const conversationId = convQ.data?.id;
  const messagesQ = useAIMessages(conversationId);
  const sendMut = useSendAIMessage();
  const countQ = useTodayAICount(userId);
  const { isPremium } = useIsPremium();

  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messagesQ.data?.length]);

  const remaining = Math.max(0, FREE_DAILY_LIMIT - (countQ.data ?? 0));
  const blocked = !isPremium && remaining === 0;

  const onSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || !conversationId) return;
    if (blocked) {
      const seePlans = await confirmAction({
        title: 'Daily limit reached',
        message: 'Upgrade to Premium for unlimited coaching.',
        confirmLabel: 'See plans',
        cancelLabel: 'Not now'
      });
      if (seePlans) router.push('/modals/premium');
      return;
    }
    setInput('');
    try {
      await sendMut.mutateAsync({ conversationId, message: content });
    } catch (e: any) {
      notify('Could not reach the coach', e.message ?? 'Please try again.');
      setInput(content);
    }
  };

  return (
    <Screen scroll={false}>
      <ScreenHeader title="AI Coach" onClose={() => router.back()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {convQ.isLoading ? (
          <LoadingState />
        ) : convQ.isError ? (
          <ErrorState onRetry={() => convQ.refetch()} />
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={{ gap: theme.spacing(1), padding: theme.spacing(1), paddingBottom: theme.spacing(2) }}
              style={{ flex: 1 }}
            >
              {(messagesQ.data ?? []).length === 0 ? (
                <EmptyState
                  title="Your coach is ready"
                  body="Ask anything about your challenge, streak, or recovery."
                />
              ) : (
                (messagesQ.data ?? []).map((m: any) => (
                  <View
                    key={m.id}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    <Card
                      style={{
                        backgroundColor: m.role === 'user' ? theme.colors.primary : theme.colors.surface,
                        borderColor: m.role === 'user' ? theme.colors.primary : theme.colors.border,
                      }}
                    >
                      <AppText style={{ color: m.role === 'user' ? '#000' : theme.colors.text }}>
                        {m.content}
                      </AppText>
                    </Card>
                  </View>
                ))
              )}
              {sendMut.isPending ? (
                <View style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                  <Card><AppText muted>Thinking...</AppText></Card>
                </View>
              ) : null}

              {(messagesQ.data ?? []).length === 0 ? (
                <Card style={{ marginTop: theme.spacing(2) }}>
                  <AppText variant="label">Prompt ideas</AppText>
                  <View style={{ gap: 8, marginTop: 8 }}>
                    {PROMPTS.map((p) => (
                      <Card key={p} onPress={() => onSend(p)} style={{ backgroundColor: theme.colors.surface2 }}>
                        <AppText muted>{p}</AppText>
                      </Card>
                    ))}
                  </View>
                </Card>
              ) : null}
            </ScrollView>

            <View style={{ padding: theme.spacing(1), gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
              {!isPremium ? (
                <AppText variant="caption" muted style={{ textAlign: 'center' }}>
                  {blocked
                    ? `You've used today's free messages. Upgrade for unlimited.`
                    : `${remaining} free messages left today`}
                </AppText>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Input
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask your coach..."
                  multiline
                  style={{ flex: 1, minHeight: 44, maxHeight: 120 }}
                  editable={!sendMut.isPending}
                />
                <Button
                  label={sendMut.isPending ? '...' : 'Send'}
                  onPress={() => onSend()}
                  disabled={sendMut.isPending || !input.trim()}
                />
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
