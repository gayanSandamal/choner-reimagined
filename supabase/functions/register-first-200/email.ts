// The one email a First 200 registrant gets before launch.
//
// WHAT COSTS YOU THE INBOX, MEASURED RATHER THAN GUESSED (15 October 2026)
//
// This mail sat in Promotions for days. The thing that cracked it was a
// natural experiment nobody designed: the Supabase auth verification mail and
// this one went from the SAME address, the same domain, the same Amazon SES
// IP, to the SAME fresh Gmail account on the same day. "Confirm your Choner
// account" landed in the inbox. This one did not.
//
// That single comparison rules out the sender, the domain, the IP, SPF, DKIM,
// DMARC, reputation, List-Unsubscribe and the recipient's history, because
// both mails shared every one of them. It also clears the design: the
// verification mail is a card too, dark header bar, orange button, footer, and
// it reaches the inbox anyway.
//
// What was left was PURPOSE and the conventions that go with it. Four variants
// were then sent to one fresh account, changing one thing at a time:
//
//   1. one job only, zero links, preheader, "sent to you because" footer
//                                                               -> INBOX
//   2. + the mission copy, "we'll be in touch", a reply invitation
//                                                               -> INBOX
//   3. + the referral link, minus the reply invitation           -> INBOX
//
// So the brand copy is fine. The referral link is fine. What was never fine
// was an email with no preheader, no "sent to you because" footer, and no
// clear single subject line: it read as a mailshot because it was shaped like
// one, not because of anything it said.
//
// KEEP THESE THREE OR IT GOES BACK TO PROMOTIONS:
//   * the preheader, stating the one thing this email is for
//   * the "This email was sent to X because..." footer
//   * a subject that names the contents and promises nothing
//     ("Your Choner access code", in the shape of "Confirm your Choner
//     account", which is the mail that always reached the inbox)
//
// If this ever lands in Promotions again, change ONE thing, send to an address
// that has never seen this domain, and read the result. Four tests settled
// what a week of theorising did not.
//
// NO PERMISSION FOOTER AND NO List-Unsubscribe. This mail is transactional,
// asked for seconds earlier. THE LAUNCH EMAIL TO ALL 200 IS GENUINELY BULK and
// must carry both.
//
// Gmail clips at ~102KB and hides whatever follows, which would hide the code.
// Keeping this short is not only taste.

export interface WelcomeEmail {
  firstName: string;
  accessCode: string;
  referralUrl: string;
  email: string;
}

// Inline styles only: Gmail strips <style> blocks. Tables rather than flexbox,
// because Outlook's renderer is Word's.
export function welcomeHtml({ firstName, accessCode, referralUrl, email }: WelcomeEmail): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Choner access code</title></head>
<body style="margin:0;padding:0;background:#FDFCFB;">
<!-- The preheader: the line Gmail shows next to the subject in the list, and
     one of the three things that keep this out of Promotions. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your access code for The First 200.</div>
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

   <tr><td style="font-size:14.5px;line-height:1.6;color:#5A6B75;padding-bottom:22px;">
     Here's your access code.</td></tr>

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

   <tr><td style="font-size:14.5px;line-height:1.6;color:#5A6B75;padding:22px 0 0;">
     When Choner goes live, sign up with <strong style="color:#1C2B33;">${esc(email)}</strong>
     and we'll recognize you. You'll only need the code if you use a different
     address, so keep this email.
   </td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;color:#5A6B75;padding:22px 0 0;">
     We're bringing together the first 200 people who believe staying healthy
     shouldn't have to be something you do alone. Someone to show up with.
   </td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;color:#5A6B75;padding:14px 0 0;">
     We'll be in touch before then.
   </td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;padding:22px 0 0;">
     Know someone who should be here?<br>
     <a href="${esc(referralUrl)}" style="color:#FD5B01;font-weight:600;text-decoration:none;">Invite them &rarr;</a>
   </td></tr>

   <tr><td style="font-size:14.5px;line-height:1.6;padding:24px 0 0;">
     Thanks for being early. It matters.<br><br>
     The Choner team
   </td></tr>

   <!-- The second of the three. The verification mail has this and this one
        did not, which is part of why it read as a mailshot. -->
   <tr><td style="font-size:12.5px;line-height:1.6;color:#7C8C96;padding:26px 0 0;
                  border-top:1px solid #EFEDEA;">
     This email was sent to ${esc(email)} because you joined The First 200.
     If that wasn't you, you can safely ignore it.
   </td></tr>

  </table>
 </td></tr>
</table>
</body></html>`;
}

// Sent alongside the HTML. Some clients prefer it, some people read mail in
// plain text, and an HTML-only message is a weak signal to spam filters.
//
// The referral URL is written out in full: plain text has no links, so
// "Invite them" on its own would be a dead end.
export function welcomeText({ firstName, accessCode, referralUrl, email }: WelcomeEmail): string {
  return `Hi ${firstName},

You're one of The First 200.

Here's your access code.

YOUR CODE: ${accessCode}

When Choner goes live, sign up with ${email} and we'll recognize you. You'll
only need the code if you use a different address, so keep this email.

We're bringing together the first 200 people who believe staying healthy
shouldn't have to be something you do alone. Someone to show up with.

We'll be in touch before then.

Know someone who should be here? Invite them:
${referralUrl}

Thanks for being early. It matters.

The Choner team

This email was sent to ${email} because you joined The First 200.
If that wasn't you, you can safely ignore it.`;
}

// Utilitarian, in the shape of the subject that always reached the inbox
// ("Confirm your Choner account"): it names the thing inside and promises
// nothing else. "Choner" and "code" are also the words someone would search
// for in two weeks. Changing this is changing a tested variable.
export const WELCOME_SUBJECT = 'Your Choner access code';

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}
