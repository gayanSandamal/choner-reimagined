// The First 200 registration endpoint.
//
// Everything the browser must not hold lives here: the service-role key that
// writes to the database and the Resend key that sends mail. The page posts a
// form and gets back a code; it never touches either.
//
// It also means prelaunch_registrations can keep RLS on with ZERO policies.
// A browser-side insert would need a select policy too, just to read back the
// code it has to display - and a select policy on that table makes 200 people's
// email, age, gender and neighbourhood publicly downloadable along with every
// claim token. Returning only the new row's code from here avoids ever
// granting a read.
//
// DEPLOY
//   supabase functions deploy register-first-200 --no-verify-jwt
//   supabase secrets set RESEND_API_KEY=re_xxx MAIL_FROM="Choner <hello@choner.io>"
//
// --no-verify-jwt is required: registrants are not logged in.
//
// SCHEMA THIS EXPECTS (see docs/FIRST_200_BUILD_SPEC.md §3):
//   alter table public.prelaunch_registrations
//     add column if not exists welcome_sent_at timestamptz;
//   -- register_prelaunch() returns should_send_welcome, true only when the row
//   -- is complete (activity_key present) and welcome_sent_at is still null.
//   create or replace function public.mark_welcome_sent(p_token text) ...

import { WELCOME_SUBJECT, welcomeHtml, welcomeText } from './email.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? 'Choner <hello@choner.io>';
const JOIN_URL = Deno.env.get('JOIN_URL') ?? 'https://join.choner.io';

// An allowlist rather than '*': this endpoint writes, so only our own page
// should be able to call it from a browser.
const ALLOWED_ORIGINS = new Set([
  'https://join.choner.io',
  'https://choner.io',
  'http://localhost:3000',
  'http://localhost:5173',
]);

// Mirrors the table's check constraints. Validated here as well as in Postgres
// because a rejected constraint is a 500 with a Postgres message in it, and a
// bad value should be a clean 400 instead.
// 'sleep_better' is retired (15 October) but still accepted: join.choner.io is
// live and a browser holding the old page cached would otherwise have its
// signup rejected outright. Dropping it costs a real registration; keeping it
// costs nothing, since nothing reads the value yet.
const GOALS = ['move_more', 'get_stronger', 'reduce_stress', 'improve_energy', 'sleep_better'];
const STRUGGLES = ['start_but_stop', 'lack_accountability', 'too_busy', 'overwhelmed'];
const AGES = ['18-24', '25-34', '35-44', '45-54', '55+'];
const GENDERS = ['male', 'female', 'prefer_not_to_say'];
const MODES = ['together', 'separate', 'either'];
const TIMES = ['early_morning', 'morning', 'afternoon', 'evening', 'night'];
const ACTIVITIES = ['running', 'jogging', 'walking', 'cycling', 'yoga', 'home_workouts'];

function cors(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://join.choner.io';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors(origin) },
  });

// Returns the value only if it is one we allow; anything else becomes null
// rather than an error. The form cannot produce a bad value, so a bad value
// means someone is posting by hand and the honest response is to drop the
// field, not to fail a registration we would otherwise keep.
const oneOf = (v: unknown, allowed: string[]): string | null =>
  typeof v === 'string' && allowed.includes(v) ? v : null;

const someOf = (v: unknown, allowed: string[], cap = 10): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string' && allowed.includes(x)))].slice(0, cap) : [];

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Lenient on purpose: 07X XXX XXXX, +947..., 947... all arrive. A number we
// cannot parse is kept as typed rather than discarded - a human will read it.
function normalisePhone(v: unknown): string | null {
  const d = String(v ?? '').replace(/[^0-9+]/g, '');
  if (!d) return null;
  if (d.startsWith('+')) return d.slice(0, 20);
  if (d.startsWith('0')) return ('+94' + d.slice(1)).slice(0, 20);
  if (d.startsWith('94')) return ('+' + d).slice(0, 20);
  return d.slice(0, 20);
}

async function rpc(name: string, args: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${name} failed (${res.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400, origin);
  }

  // The honeypot is a field hidden from people and filled in by bots. Answer
  // 200 so the bot believes it worked and does not come back to try again.
  if (String(body.website ?? '').trim() !== '') {
    return json({ ok: true, access_code: 'F2-XXXXXX', claim_token: '' }, 200, origin);
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const fullName = String(body.full_name ?? '').trim();

  if (!validEmail(email)) return json({ error: 'invalid_email' }, 400, origin);
  if (fullName.length < 2) return json({ error: 'invalid_name' }, 400, origin);

  const payload = {
    full_name: fullName.slice(0, 120),
    email,
    phone: normalisePhone(body.phone),
    primary_goal: oneOf(body.primary_goal, GOALS),
    main_struggle: oneOf(body.main_struggle, STRUGGLES),
    age_range: oneOf(body.age_range, AGES),
    gender: oneOf(body.gender, GENDERS),
    mode: oneOf(body.mode, MODES),
    times_of_day: someOf(body.times_of_day, TIMES, 5),
    location: typeof body.location === 'string' && body.location ? body.location : null,
    district: typeof body.district === 'string' && body.district ? body.district : null,
    activity_key: oneOf(body.activity_key, ACTIVITIES),
    exercises: Array.isArray(body.exercises)
      ? body.exercises.filter((e) => typeof e === 'string').slice(0, 4)
      : [],
    consent_contact: body.consent_contact === true,
    consent_match: body.consent_match === true,
    ref: typeof body.ref === 'string' ? body.ref : null,
    source: typeof body.source === 'string' ? body.source.slice(0, 60) : null,
  };

  let result: { access_code: string; claim_token: string; should_send_welcome: boolean };
  try {
    result = await rpc('register_prelaunch', { p: payload });
  } catch (err) {
    console.error('register_prelaunch', err);
    return json({ error: 'could_not_save' }, 500, origin);
  }

  // The form posts twice - once after step 1, once at the end - so the email
  // goes only when the row is complete and has not been mailed before.
  // Sending two welcomes to 200 people is the kind of mistake everyone sees.
  if (result.should_send_welcome && RESEND_KEY) {
    const view = {
      firstName: fullName.split(/\s+/)[0] || 'there',
      accessCode: result.access_code,
      referralUrl: `${JOIN_URL}/?ref=${result.claim_token}`,
      // Echoed back so they know WHICH address the app will recognise.
      email,
    };
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: MAIL_FROM,
          to: [email],
          subject: WELCOME_SUBJECT,
          html: welcomeHtml(view),
          text: welcomeText(view),
          // NO List-Unsubscribe. It is one of the strongest bulk-mail markers
          // Gmail reads, and it was filing this under Promotions. The header
          // exists for mail people did not individually ask for; this one was
          // asked for seconds earlier and is transactional.
          // THE LAUNCH EMAIL TO ALL 200 IS GENUINELY BULK. It must carry
          // List-Unsubscribe, or a spam report there starts costing us the
          // app's own auth mail. Whoever builds that broadcast: put it back.
        }),
      });
      if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
      await rpc('mark_welcome_sent', { p_token: result.claim_token });
    } catch (err) {
      // Never fail the request over the email. The registration is the thing
      // that matters; welcome_sent_at stays null and a retry picks it up.
      console.error('welcome email', err);
    }
  }

  return json(
    { ok: true, access_code: result.access_code, claim_token: result.claim_token },
    200,
    origin,
  );
});
