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

  const cta = acceptUrl
    ? `<a href="${acceptUrl}" style="display:inline-block; margin-top:16px; background:#FF8A1F; color:#031A2D; font-weight:bold; text-decoration:none; padding:12px 22px; border-radius:999px">Accept the challenge</a>
       <p style="color:#A5B6C8; font-size:12px; margin-top:14px">Or paste this link into Choner: ${acceptUrl}</p>`
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

  return Response.json(result);
});
