// The one email a First 200 registrant gets before launch.
//
// WHY THIS LOOKS LIKE NOTHING
//
// It used to be a card: tables, a shadow, a wordmark, an orange heading, a
// dashed code box and a referral link. Gmail filed it under Promotions, which
// is exactly what that shape is for. Nothing in a header can overrule the
// classifier, so the only lever left is to stop sending something that looks
// like a promotion.
//
// So: no tables, no card, no logo, no buttons, no colours, and NO LINKS AT
// ALL. A link count of zero is one of the strongest Primary signals there is,
// and the referral link was the only one worth keeping, which the ending
// screen already offers with a share sheet. The HTML here is a plain-text
// email wearing a <p> or two, which is what a person's mail actually looks
// like.
//
// The reply invitation at the end is doing real work. One reply from the
// recipient trains Gmail permanently for this sender, for that person, and no
// amount of reputation buys that as cheaply.
//
// The List-Unsubscribe header went with it (see index.ts): this is
// transactional, asked for seconds earlier, and that header is a bulk marker.
// THE LAUNCH EMAIL TO ALL 200 IS GENUINELY BULK AND MUST CARRY IT.
//
// Kept short on purpose. Gmail clips at ~102KB and hides whatever follows.

export interface WelcomeEmail {
  firstName: string;
  accessCode: string;
  referralUrl: string;
  email: string;
}

// Deliberately spare. Default font, default size, one bold line for the code.
// Anything more decorative moves it back to Promotions.
export function welcomeHtml({ firstName, accessCode, email }: WelcomeEmail): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:16px;background:#ffffff;color:#222222;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
             font-size:15px;line-height:1.55;">
<p>Hi ${esc(firstName)},</p>

<p>You're one of The First 200.</p>

<p>Your code is <strong>${esc(accessCode)}</strong></p>

<p>Choner isn't online yet. But when it is, you'll already have a place.
Sign up with ${esc(email)} and we'll recognize you. Nothing else to fill out.
You're already in.</p>

<p>Keep the code. You'll only need it if you use a different email address.</p>

<p>We're bringing together the first 200 people who believe staying healthy
shouldn't have to be something you do alone. Someone to show up with.</p>

<p>We'll be in touch before Choner goes live.</p>

<p>If you have a second, hit reply and tell us what you're trying to start.
We read every one.</p>

<p>Thanks for being early. It matters.</p>

<p>The Choner team</p>
</body></html>`;
}

// Sent alongside the HTML. Some clients prefer it, some people read mail in
// plain text, and an HTML-only message is a weak signal to spam filters.
export function welcomeText({ firstName, accessCode, email }: WelcomeEmail): string {
  return `Hi ${firstName},

You're one of The First 200.

Your code is ${accessCode}

Choner isn't online yet. But when it is, you'll already have a place.
Sign up with ${email} and we'll recognize you. Nothing else to fill out.
You're already in.

Keep the code. You'll only need it if you use a different email address.

We're bringing together the first 200 people who believe staying healthy
shouldn't have to be something you do alone. Someone to show up with.

We'll be in touch before Choner goes live.

If you have a second, hit reply and tell us what you're trying to start.
We read every one.

Thanks for being early. It matters.

The Choner team`;
}

// Searchable rather than clever: "Choner" and "First 200" are the words
// someone would actually type to find this in two weeks.
export const WELCOME_SUBJECT = "You're one of The First 200";

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}
