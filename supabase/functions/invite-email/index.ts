import { Resend } from "npm:resend@4.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withCors } from "../_shared/cors.ts";
import { rateLimited } from "../_shared/rate-limit.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Security review, 17 November 2026. This used to send whatever it was given
// to whatever address it was given, and the gateway's verify_jwt accepts the
// public app key, so anyone could send mail as hello@choner.io. Now:
//   - the caller must be a signed-in user (re-checked with getUser),
//   - the invite must exist, be theirs and still be pending; the address and
//     code come from that row, not from the request,
//   - the inviter's name comes from their profile and is HTML-escaped,
//   - at most DAILY_LIMIT invite emails per person per 24 hours.
const DAILY_LIMIT = 20;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

// CORS (preflight and the allowlist) comes from withCors: the preflight is
// answered before the body is touched, so an OPTIONS request with no body does
// not fall into req.json() and come back a 400 with no CORS headers at all.
Deno.serve(withCors(async (req) => {
  let body: { inviterName?: string; email?: string; challengeId?: string; token?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const { data: auth } = jwt ? await admin.auth.getUser(jwt) : { data: null };
  const uid = auth?.user?.id;
  if (!uid) {
    return Response.json({ error: "Sign in to send an invite." }, { status: 401 });
  }
  if (!body.token) {
    return Response.json({ error: "Missing invite." }, { status: 400 });
  }

  const { data: invite } = await admin
    .from("challenge_invites")
    .select("email, code, token, status, invited_by")
    .eq("token", body.token)
    .maybeSingle();
  if (!invite || invite.invited_by !== uid || invite.status !== "pending" || !invite.email) {
    return Response.json({ error: "Invite not found." }, { status: 404 });
  }

  // Per-minute burst cap on top of the daily one below: the daily count only
  // looks at invites created, so it does not slow someone resending one row.
  if (await rateLimited(`invite-email:${uid}`, 5, 60)) {
    return Response.json({ error: "Slow down a little. Try again in a minute." }, { status: 429 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("challenge_invites")
    .select("id", { count: "exact", head: true })
    .eq("invited_by", uid)
    .gte("created_at", since);
  if ((count ?? 0) > DAILY_LIMIT) {
    return Response.json({ error: "Too many invites today. Try again tomorrow." }, { status: 429 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", uid)
    .maybeSingle();
  body.email = invite.email;
  body.code = invite.code ?? undefined;
  body.inviterName = escapeHtml((profile?.full_name ?? "").trim().slice(0, 60) || "A friend");

  const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "hello@choner.io";

  // Base for the accept link. Set APP_INVITE_URL to your web/app origin
  // (e.g. https://app.choner.io) in production; falls back to the app scheme.
  const base = (Deno.env.get("APP_INVITE_URL") ?? "choner://").replace(/\/?$/, "/");
  const acceptUrl = `${base}invite/${encodeURIComponent(invite.token)}`;
  const inviter = body.inviterName ?? "A friend";
  // What a person types. The 6-character code (202609291300) when the caller
  // sent one; the long token otherwise, which accept_invite_by_code still takes.
  const typedCode = escapeHtml(body.code ?? body.token);

  // When the base is a custom scheme (choner://), the button is useless to a
  // recipient who hasn't installed the app yet — and that's every invitee, plus
  // most mail clients won't even linkify it. So the code is always shown as the
  // channel that can't fail: install, then Welcome → "I have an invite code".
  const isDeepLink = !/^https?:/i.test(base);

  const cta = body.token
    ? `${
        isDeepLink
          ? ""
          : `<a href="${acceptUrl}" style="display:inline-block; margin-top:16px; background:#FD8302; color:#001827; font-weight:bold; text-decoration:none; padding:12px 22px; border-radius:999px">Accept the challenge</a>`
      }
       <p style="color:#A5B6C8; font-size:13px; margin-top:18px; margin-bottom:6px">${
         isDeepLink
           ? "Install Choner, then tap <b>I have an invite code</b> on the welcome screen and enter:"
           : "Or enter this code in the app:"
       }</p>
       <div style="font-family:monospace; font-size:18px; letter-spacing:1px; color:#F7FAFC; background:#0A2740; border:1px solid #16507E; border-radius:10px; padding:12px 16px; display:inline-block">${typedCode}</div>
       ${
         isDeepLink && acceptUrl
           ? `<p style="color:#A5B6C8; font-size:12px; margin-top:14px">Already have the app? Open: ${acceptUrl}</p>`
           : ""
       }`
    : `<p style="margin-bottom:0">Open Choner to accept and start together.</p>`;

  const html = `
    <div style="font-family: Arial, sans-serif; background:#001827; color:#F7FAFC; padding:24px; border:1px solid #16507E; border-radius:20px">
      <h2 style="color:#FD8302; margin:0 0 12px 0">You were invited to a Choner challenge</h2>
      <p>${inviter} invited you to join a momentum-building challenge.</p>
      ${cta}
    </div>
  `;

  const result = await resend.emails.send({
    from,
    to: body.email,
    subject: "You were invited to a Choner challenge",
    html
  });

  // Resend reports failures in the BODY, not the HTTP status — a refused send
  // still resolves. Returning that verbatim made every failure look like a
  // success to supabase.functions.invoke, so the app cheerfully said "invite
  // emailed" for mail that was never accepted. Surface it as a real error so
  // the caller can fall back to the share link and tell the truth.
  if (result.error) {
    return Response.json(
      {
        error: result.error.message ?? "Email provider rejected the message.",
        provider: "resend",
        // The sandbox from-address only delivers to the Resend account owner;
        // this is the common case until a domain is verified.
        hint: /verify a domain/i.test(result.error.message ?? "")
          ? "No verified sending domain. Verify one at resend.com/domains and set RESEND_FROM_EMAIL to an address on it."
          : undefined
      },
      { status: 502 }
    );
  }

  return Response.json(result);
}));
