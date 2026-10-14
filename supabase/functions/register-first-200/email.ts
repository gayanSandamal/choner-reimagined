// The one email a First 200 registrant gets before launch.
//
// Its only real job is that they still have their code in two weeks, which is
// why the subject line is the words someone would actually search for ("Choner"
// and "First 200") rather than anything clever, and why the code is selectable
// text and not an image. On a phone nobody retypes a code they cannot copy.
//
// Kept deliberately short. Gmail clips at ~102KB and appends a "View entire
// message" link that hides whatever follows; a short email never gets near it,
// and never buries the code.
//
// NO PERMISSION FOOTER. This is transactional: the person asked for it seconds
// earlier, so the "you're getting this because..." line was list-mail furniture
// under a message that reads as personal. The opt-out is still there, drawn by
// Gmail and Outlook from the List-Unsubscribe header the function sends. The
// LAUNCH email to all 200 is genuinely bulk and should carry the full footer.

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
     You're one of The First 200.</td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;color:#5A6B75;padding-bottom:18px;">
     Choner isn't online yet. But when it is, you'll already have a place.</td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;color:#5A6B75;padding-bottom:22px;">
     Sign up with <strong style="color:#1C2B33;">${esc(email)}</strong> and we'll
     recognize you. Nothing else to fill out. You're already in.</td></tr>

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
     Keep it. You'll only need it if you use a different email address.
   </td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;color:#5A6B75;padding:22px 0 0;">
     We're bringing together the first 200 people who believe staying healthy
     shouldn't have to be something you do alone. Someone to show up with.
   </td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;color:#5A6B75;padding:14px 0 0;">
     We'll be in touch before Choner goes live.
   </td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;padding:22px 0 0;">
     Know someone who should be here?<br>
     <a href="${esc(referralUrl)}" style="color:#FD5B01;font-weight:600;text-decoration:none;">Invite them &rarr;</a>
   </td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;padding:24px 0 0;">
     Thanks for being early. It matters.<br><br>
     The Choner team
   </td></tr>

  </table>
 </td></tr>
</table>
</body></html>`;
}

// Sent alongside the HTML. Some clients prefer it, some people read mail in
// plain text, and spam filters treat an HTML-only message as a weak signal.
//
// The referral URL is written out in full here rather than hidden behind words:
// plain text has no links, so "Invite them" alone would be a dead end.
export function welcomeText({ firstName, accessCode, referralUrl, email }: WelcomeEmail): string {
  return `Hi ${firstName},

You're one of The First 200.

Choner isn't online yet. But when it is, you'll already have a place.

Sign up with ${email} and we'll recognize you. Nothing else to fill out.
You're already in.

YOUR CODE: ${accessCode}

Keep it. You'll only need it if you use a different email address.

We're bringing together the first 200 people who believe staying healthy
shouldn't have to be something you do alone. Someone to show up with.

We'll be in touch before Choner goes live.

Know someone who should be here? Invite them:
${referralUrl}

Thanks for being early. It matters.

The Choner team`;
}

export const WELCOME_SUBJECT = "You're one of The First 200";

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}
