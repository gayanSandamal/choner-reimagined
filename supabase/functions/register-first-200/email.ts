// The one email a First 200 registrant gets before launch.
//
// WHY IT DOES EXACTLY ONE THING
//
// 15 October, a natural experiment nobody designed. The Supabase auth
// verification mail and this one went from the SAME address, the same domain,
// the same Amazon SES IP, to the SAME fresh Gmail account on the same day.
// "Confirm your Choner account" landed in the inbox. This one landed in
// Promotions. That rules out the sender, the domain, the IP, SPF, DKIM, DMARC,
// reputation, List-Unsubscribe and the recipient's history, because both mails
// shared all of them.
//
// IT ALSO CLEARS THE DESIGN. The verification mail is a card too: dark header
// bar, rounded white panel, a big orange button, a footer. It sits in the
// inbox anyway. A stripped, link-free, table-free version of THIS mail was
// tried first and still went to Promotions, which says the same thing from the
// other side. Layout is not the variable. Do not strip this email again.
//
// What actually differed was PURPOSE. The verification mail does one job and
// says so. This one used to do four: hand over a code, explain the mission,
// ask for a referral, and ask for a reply. A referral call to action is about
// as promotional as a signal gets, and a mission statement is marketing copy
// however sincerely it is meant.
//
// So this email now does one job: it hands over the code. The conventions of
// transactional mail come with it, copied from the message that works:
//   * a preheader line that states the single purpose
//   * one destination, or none
//   * a footer that says who it was sent to and what to do if it was not you
//
// WHAT WAS REMOVED, AND WHERE IT WENT:
//   "We're bringing together the first 200 people..."  -> the page says this
//   "Know someone who should be here? Invite them"     -> the ending screen
//                                                         has a share button
//   "We'll be in touch before Choner goes live."       -> it is a promise of
//                                                         future mail, which
//                                                         is a bulk signal
//   "Hit reply and tell us what you're trying to start" -> worth re-adding
//                                                          LATER, one change
//                                                          at a time, once
//                                                          the inbox is proven
//
// NO PERMISSION FOOTER AND NO List-Unsubscribe. This is transactional. THE
// LAUNCH EMAIL TO ALL 200 IS GENUINELY BULK and must carry both.
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
export function welcomeHtml({ firstName, accessCode, email }: WelcomeEmail): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Choner access code</title></head>
<body style="margin:0;padding:0;background:#FDFCFB;">
<!-- The preheader: the line Gmail shows next to the subject in the list. It
     states the single purpose before anyone opens anything. -->
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
     When Choner opens, sign up with <strong style="color:#1C2B33;">${esc(email)}</strong>
     and we'll recognize you. You'll only need the code if you use a different
     address, so keep this email.
   </td></tr>

   <!-- The convention the verification mail uses, and this one did not. -->
   <tr><td style="font-size:12.5px;line-height:1.6;color:#7C8C96;padding:26px 0 0;
                  border-top:1px solid #EFEDEA;margin-top:10px;">
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
export function welcomeText({ firstName, accessCode, email }: WelcomeEmail): string {
  return `Hi ${firstName},

You're one of The First 200.

Here's your access code.

YOUR CODE: ${accessCode}

When Choner opens, sign up with ${email} and we'll recognize you. You'll
only need the code if you use a different address, so keep this email.

This email was sent to ${email} because you joined The First 200.
If that wasn't you, you can safely ignore it.`;
}

// Utilitarian, in the shape of the subject that works ("Confirm your Choner
// account"): it names the thing inside and promises nothing else. "Choner" and
// "code" are also the words someone would search for in two weeks.
export const WELCOME_SUBJECT = 'Your Choner access code';

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}
