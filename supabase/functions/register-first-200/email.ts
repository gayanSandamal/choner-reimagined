// The one email a First 200 registrant gets before launch.
//
// Its only real job is that they still have their code in two weeks, which is
// why the subject line is the words someone would actually search for ("Choner"
// and "First 200") rather than anything clever, and why the code is selectable
// text and not an image. On a phone nobody retypes a code they cannot copy.
//
// Kept deliberately short. Gmail clips at ~102KB and appends a "View entire
// message" link that hides whatever follows; a six-line email never gets near
// it, and never buries the code.

export interface WelcomeEmail {
  firstName: string;
  accessCode: string;
  referralUrl: string;
  email: string;
}

// Inline styles only: Gmail strips <style> blocks, so a stylesheet would leave
// the email unformatted for most of the list. Tables rather than flexbox for
// the same reason: Outlook's renderer is Word's.
export function welcomeHtml({ firstName, accessCode, referralUrl, email }: WelcomeEmail): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FDFCFB;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FDFCFB;">
 <tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="max-width:460px;background:#FFFFFF;border-radius:20px;padding:32px 28px;
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                color:#1C2B33;box-shadow:0 8px 24px rgba(28,43,51,.07);">

   <tr><td style="font-size:26px;font-weight:600;letter-spacing:-1px;padding-bottom:22px;">
     choner<span style="color:#FD8302;">.</span></td></tr>

   <tr><td style="font-size:15px;line-height:1.6;padding-bottom:6px;">
     Hi ${esc(firstName)},</td></tr>

   <tr><td style="font-size:21px;font-weight:600;line-height:1.35;padding:10px 0 6px;">
     You're in. You're one of The First 200.</td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;color:#5A6B75;padding-bottom:22px;">
     When Choner goes online, sign up with <strong style="color:#1C2B33;">${esc(email)}</strong>
     and we'll know you already. Nothing to type.</td></tr>

   <!-- Selectable text, never an image: they have to be able to copy it. -->
   <tr><td align="center" style="padding-bottom:8px;">
     <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center"
          style="background:#FDFCFB;border:1.5px dashed #E4E0DC;border-radius:16px;padding:18px 32px;">
        <div style="font-size:11px;font-weight:600;letter-spacing:1.2px;color:#7C8C96;
                    text-transform:uppercase;padding-bottom:6px;">Your code</div>
        <div style="font-size:27px;font-weight:700;letter-spacing:2px;color:#1C2B33;
                    font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">
          ${esc(accessCode)}</div>
      </td></tr>
     </table>
   </td></tr>

   <tr><td style="font-size:12.5px;line-height:1.55;color:#7C8C96;padding:10px 0 0;">
     The code is only needed if you sign up with a different address. Worth
     keeping this email either way.
   </td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;color:#5A6B75;padding:22px 0 0;">
     We're putting together the first group of people who want the same thing you
     do: someone to show up with. We'll be in touch before Choner goes online.
   </td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;padding:18px 0 0;">
     Know someone who should be here too?<br>
     <a href="${esc(referralUrl)}" style="color:#FD5B01;font-weight:600;">${esc(referralUrl)}</a>
   </td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;padding:24px 0 0;">
     Thanks for being early. It genuinely matters.<br><br>
     Dinesh<br>
     <span style="color:#7C8C96;">Co-founder, Choner</span>
   </td></tr>

   <tr><td style="font-size:11.5px;line-height:1.5;color:#9AA7AE;padding-top:26px;
                  border-top:1px solid #EFEDEA;margin-top:10px;">
     You're getting this because you joined The First 200 at choner.io.
     Don't want these? Just reply and say so. A real person reads it.
   </td></tr>

  </table>
 </td></tr>
</table>
</body></html>`;
}

// Sent alongside the HTML. Some clients prefer it, some people read mail in
// plain text, and spam filters treat an HTML-only message as a weak signal.
export function welcomeText({ firstName, accessCode, referralUrl, email }: WelcomeEmail): string {
  return `Hi ${firstName},

You're in. You're one of The First 200.

When Choner goes online, sign up with ${email} and we'll know you already.
Nothing to type.

YOUR BACKUP CODE: ${accessCode}

You only need this if you sign up with a different address.

We're putting together the first group of people who want the same thing you
do: someone to show up with. We'll be in touch before Choner goes online.

Know someone who should be here too?
${referralUrl}

Thanks for being early. It genuinely matters.

Dinesh
Co-founder, Choner

---
You're getting this because you joined The First 200 at choner.io.
Don't want these? Just reply and say so. A real person reads it.`;
}

export const WELCOME_SUBJECT = "You're one of The First 200";

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}
