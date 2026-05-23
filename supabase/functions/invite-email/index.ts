import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req) => {
  let body: { inviterName?: string; email?: string; challengeId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "hello@choner.io";

  const html = `
    <div style="font-family: Arial, sans-serif; background:#031A2D; color:#F7FAFC; padding:24px; border:1px solid #16507E; border-radius:20px">
      <h2 style="color:#FF8A1F; margin:0 0 12px 0">You were invited to a Choner challenge</h2>
      <p>${body.inviterName} invited you to join a momentum-building challenge.</p>
      <p style="margin-bottom:0">Open Choner to accept and start together.</p>
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
