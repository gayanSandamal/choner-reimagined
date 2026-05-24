import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type ConversationRow = Database['public']['Tables']['ai_conversations']['Row'];
type MessageRow = Database['public']['Tables']['ai_messages']['Row'];

export async function listConversations(userId: string): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function getOrCreateActiveConversation(userId: string): Promise<ConversationRow> {
  const existing = await listConversations(userId);
  if (existing[0]) return existing[0];
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ user_id: userId, title: 'New chat' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export interface SendMessageResponse {
  reply: string;
  conversationId: string;
  messageId: string;
}

/**
 * Calls the ai-coach edge function. The function is responsible for
 * persisting both the user message and the assistant reply to ai_messages.
 */
export async function sendMessage(input: {
  conversationId: string;
  message: string;
}): Promise<SendMessageResponse> {
  const { data, error } = await supabase.functions.invoke('ai-coach', { body: input });
  if (error) throw error;
  return data as SendMessageResponse;
}

export async function getTodayMessageCount(userId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('ai_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', start.toISOString());
  if (error) throw error;
  return count ?? 0;
}
