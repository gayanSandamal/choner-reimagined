// AI Coach: receives { conversationId, message } from the mobile client, builds
// a context-aware prompt from the user's profile and recent activity, calls
// OpenAI, persists both turns to ai_messages, updates ai_conversations, and
// returns the reply.
//
// Required secrets:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   OPENAI_API_KEY
// Optional:
//   OPENAI_MODEL (default: gpt-4o-mini)
//   AI_DAILY_FREE_LIMIT (default: 5)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
const DAILY_FREE_LIMIT = Number(Deno.env.get('AI_DAILY_FREE_LIMIT') ?? '5');

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface ChatRequest {
  conversationId: string;
  message: string;
}

const SYSTEM_PROMPT = `You are the Choner AI Coach. You help the user build consistent
healthy habits and recover from missed days. You are warm, concise, evidence-informed,
and focus on the next achievable action. You are NOT a clinician — never give medical,
psychological, or emergency advice. If the user describes a medical or safety concern,
direct them to a qualified professional or emergency services. Keep replies under 120 words.`;

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data, error } = await admin.auth.getUser(jwt);
  if (error) return null;
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const user = await getAuthUser(req);
  if (!user) return new Response('unauthorized', { status: 401 });

  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }
  if (!body.conversationId || !body.message?.trim()) {
    return new Response('missing fields', { status: 400 });
  }

  // Confirm the conversation belongs to this user.
  const { data: conv } = await admin
    .from('ai_conversations')
    .select('id, user_id')
    .eq('id', body.conversationId)
    .maybeSingle();
  if (!conv || conv.user_id !== user.id) {
    return new Response('forbidden', { status: 403 });
  }

  // Daily-limit check (skip for premium users).
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const { data: premiumRow } = await admin
    .from('subscriptions')
    .select('status, expires_at')
    .eq('user_id', user.id)
    .maybeSingle();
  const isPremium = premiumRow && ['active', 'in_grace_period'].includes(premiumRow.status) &&
    (!premiumRow.expires_at || new Date(premiumRow.expires_at) > new Date());

  if (!isPremium) {
    const { count } = await admin
      .from('ai_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', startOfDay.toISOString());
    if ((count ?? 0) >= DAILY_FREE_LIMIT) {
      return Response.json(
        { error: 'daily_limit', limit: DAILY_FREE_LIMIT, isPremium: false },
        { status: 429 }
      );
    }
  }

  // Build context: profile + active challenge + last 14 days of checkins.
  const [{ data: profile }, { data: active }] = await Promise.all([
    admin.from('profiles').select('full_name, primary_goal, main_struggle, accountability_mode, stress_level').eq('id', user.id).maybeSingle(),
    admin
      .from('user_challenges')
      .select('*, challenge_templates(title, category), challenge_tasks(title)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCheckins } = await admin
    .from('task_checkins')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since)
    .in(
      'user_challenge_id',
      active ? [(active as { id: string }).id] : ['00000000-0000-0000-0000-000000000000']
    );

  const contextLines: string[] = [];
  if (profile) {
    contextLines.push(
      `User: ${profile.full_name ?? 'unknown'}. Goal: ${profile.primary_goal ?? '—'}. ` +
      `Struggle: ${profile.main_struggle ?? '—'}. Accountability: ${profile.accountability_mode ?? '—'}. ` +
      `Stress: ${profile.stress_level ?? '—'}.`
    );
  }
  if (active) {
    const a = active as { challenge_templates?: { title?: string }, challenge_tasks?: { title: string }[] };
    contextLines.push(`Active challenge: ${a.challenge_templates?.title ?? '—'}.`);
    contextLines.push(`Tasks: ${(a.challenge_tasks ?? []).map((t) => t.title).join(', ') || '—'}.`);
    contextLines.push(`Check-ins in last 14 days: ${recentCheckins ?? 0}.`);
  } else {
    contextLines.push('User has no active challenge right now.');
  }

  // Last 10 messages of the conversation as history.
  const { data: history } = await admin
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', body.conversationId)
    .order('created_at', { ascending: false })
    .limit(10);
  const historyAsc = (history ?? []).reverse();

  // Persist the user message before calling OpenAI.
  const { data: userMsg, error: insErr } = await admin
    .from('ai_messages')
    .insert({
      conversation_id: body.conversationId,
      user_id: user.id,
      role: 'user',
      content: body.message,
    })
    .select()
    .single();
  if (insErr) return new Response(insErr.message, { status: 500 });

  // Call OpenAI.
  const openaiBody = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `Context:\n${contextLines.join('\n')}` },
      ...historyAsc.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: body.message },
    ],
    temperature: 0.7,
    max_tokens: 250,
  };

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(openaiBody),
  });
  if (!aiRes.ok) {
    const errText = await aiRes.text();
    console.error('openai error', errText);
    return new Response('ai upstream error', { status: 502 });
  }
  const aiJson = await aiRes.json();
  const reply: string = aiJson.choices?.[0]?.message?.content?.trim() ?? '';
  const tokensIn: number | null = aiJson.usage?.prompt_tokens ?? null;
  const tokensOut: number | null = aiJson.usage?.completion_tokens ?? null;

  // Persist assistant reply + update conversation timestamp.
  const { data: assistantMsg, error: aerr } = await admin
    .from('ai_messages')
    .insert({
      conversation_id: body.conversationId,
      user_id: user.id,
      role: 'assistant',
      content: reply,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
    })
    .select()
    .single();
  if (aerr) return new Response(aerr.message, { status: 500 });

  await admin
    .from('ai_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', body.conversationId);

  return Response.json({
    reply,
    conversationId: body.conversationId,
    messageId: assistantMsg.id,
    userMessageId: userMsg.id,
  });
});
