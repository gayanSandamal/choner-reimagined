import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req) => {
  let body: { inviterName?: string; email?: string; challengeId?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "hello@choner.io";

  // Base for the accept link. Set APP_INVITE_URL to your web/app origin
  // (e.g. https://app.choner.io) in production; falls back to the app scheme.
  const base = (Deno.env.get("APP_INVITE_URL") ?? "choner://").replace(/\/?$/, "/");
  const acceptUrl = body.token ? `${base}invite/${body.token}` : null;
  const inviter = body.inviterName ?? "A friend";

  // When the base is a custom scheme (choner://), the button is useless to a
  // recipient who hasn't installed the app yet — and that's every invitee, plus
  // most mail clients won't even linkify it. So the code is always shown as the
  // channel that can't fail: install, then Welcome → "I have an invite code".
  const isDeepLink = !/^https?:/i.test(base);

  const cta = body.token
    ? `${
        isDeepLink
          ? ""
          : `<a href="${acceptUrl}" style="display:inline-block; margin-top:16px; background:#FF8A1F; color:#031A2D; font-weight:bold; text-decoration:none; padding:12px 22px; border-radius:999px">Accept the challenge</a>`
      }
       <p style="color:#A5B6C8; font-size:13px; margin-top:18px; margin-bottom:6px">${
         isDeepLink
           ? "Install Choner, then tap <b>I have an invite code</b> on the welcome screen and enter:"
           : "Or enter this code in the app:"
       }</p>
       <div style="font-family:monospace; font-size:18px; letter-spacing:1px; color:#F7FAFC; background:#0A2740; border:1px solid #16507E; border-radius:10px; padding:12px 16px; display:inline-block">${body.token}</div>
       ${
         isDeepLink && acceptUrl
           ? `<p style="color:#A5B6C8; font-size:12px; margin-top:14px">Already have the app? Open: ${acceptUrl}</p>`
           : ""
       }`
    : `<p style="margin-bottom:0">Open Choner to accept and start together.</p>`;

  const html = `
    <div style="font-family: Arial, sans-serif; background:#031A2D; color:#F7FAFC; padding:24px; border:1px solid #16507E; border-radius:20px">
      <h2 style="color:#FF8A1F; margin:0 0 12px 0">You were invited to a Choner challenge</h2>
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
});
