// RevenueCat webhook: receives entitlement events and upserts the
// `subscriptions` table that the mobile client reads via `useIsPremium()`.
//
// Set secrets before deploying:
//   supabase secrets set REVENUECAT_WEBHOOK_AUTH=<random string you also paste into RevenueCat dashboard>
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service role key>
//   supabase secrets set SUPABASE_URL=<project url>
//
// RevenueCat sends a Bearer header on every webhook delivery. We require it to match.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type RCEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIPTION_PAUSED'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'TRANSFER';

interface RCEvent {
  type: RCEventType;
  app_user_id: string;
  original_app_user_id?: string;
  product_id?: string;
  store?: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL';
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  entitlement_ids?: string[];
  is_trial_period?: boolean;
  cancel_reason?: string | null;
  auto_renew_status_at_ms?: number;
  new_product_id?: string;
}

const storeMap: Record<string, string> = {
  APP_STORE: 'app_store',
  PLAY_STORE: 'play_store',
  STRIPE: 'stripe',
  PROMOTIONAL: 'promotional',
};

function statusFor(type: RCEventType, expiresAt: Date | null): string {
  const expired = expiresAt && expiresAt.getTime() < Date.now();
  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'NON_RENEWING_PURCHASE':
    case 'PRODUCT_CHANGE':
    case 'TRANSFER':
      return expired ? 'expired' : 'active';
    case 'CANCELLATION':
      return expired ? 'expired' : 'active'; // still active until period ends
    case 'EXPIRATION':
      return 'expired';
    case 'BILLING_ISSUE':
      return 'in_billing_retry';
    case 'SUBSCRIPTION_PAUSED':
      return 'paused';
    default:
      return 'inactive';
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  const auth = req.headers.get('authorization') ?? '';
  if (!WEBHOOK_AUTH || auth !== `Bearer ${WEBHOOK_AUTH}`) {
    return new Response('unauthorized', { status: 401 });
  }

  let payload: { event?: RCEvent };
  try {
    payload = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }
  const event = payload.event;
  if (!event?.type || !event.app_user_id) {
    return new Response('missing fields', { status: 400 });
  }

  const userId = event.app_user_id;
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  const purchasedAt = event.purchased_at_ms ? new Date(event.purchased_at_ms) : null;
  const status = statusFor(event.type, expiresAt);
  const willRenew = event.type !== 'CANCELLATION' && event.type !== 'EXPIRATION';

  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId,
    revenuecat_user_id: event.original_app_user_id ?? userId,
    entitlement: event.entitlement_ids?.[0] ?? 'premium',
    status,
    product_id: event.new_product_id ?? event.product_id ?? null,
    store: event.store ? storeMap[event.store] ?? null : null,
    original_purchase_at: purchasedAt?.toISOString() ?? null,
    expires_at: expiresAt?.toISOString() ?? null,
    will_renew: willRenew,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('subscriptions upsert failed', error);
    return new Response(error.message, { status: 500 });
  }

  // Drop a one-time in-app notification on initial purchase
  if (event.type === 'INITIAL_PURCHASE') {
    await admin.from('notifications').insert({
      user_id: userId,
      kind: 'subscription',
      title: 'Welcome to Premium',
      body: 'You unlocked the full Choner toolkit. Enjoy.',
    });
  }

  return Response.json({ ok: true });
});
