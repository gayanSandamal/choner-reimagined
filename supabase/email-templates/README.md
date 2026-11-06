# Email templates

These are the auth emails Supabase sends. They live here so they are reviewable
and tracked, because the live copies exist **only in the Supabase dashboard**
and nothing else in this repo records them. If you change one in the dashboard,
change it here too, or this folder quietly becomes a lie.

| File | Dashboard template | Subject |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Confirm your email |
| `reset-password.html` | Reset password | Reset your password |

## How to install one

1. Supabase Dashboard, project `bkncpybneoqjnkhhchxg`.
2. Authentication, then **Emails**.
3. Pick the template from the list.
4. Set the subject from the table above.
5. Open the file here, copy **everything**, paste it over the whole message
   body, and save.
6. Send yourself a real signup to check it. The dashboard preview does not
   render the same way a phone does.

## The one thing not to remove

Every template prints the full link as plain text underneath the button:

```html
<p style="...">{{ .ConfirmationURL }}</p>
```

That is not decoration. It is the fix for the reported bug where the button
ignores the first tap. Mail apps on phones render the message body inside a mini
browser, and a tap that lands before the layout settles hits nothing. A visible,
copyable URL means the email still works when the tap does not.

## Design

Taken from [constants/theme.ts](../../constants/theme.ts), so the emails match
the app:

| Token | Value | Used for |
|---|---|---|
| `bg` | `#FDFCFB` | page behind the card |
| `surface` | `#FFFFFF` | the card |
| `border` | `#EFEDEA` | card edge, footer rule |
| `text` | `#1C2B33` | headings, the URL block |
| `muted` | `#7C8C96` | body copy, footer |
| `chip` | `#F4F2EF` | the URL block background |
| `navy` | `#001827` | the wordmark |
| `gradients.warm` | `#FD8302` to `#FD5B01` | the button |
| `radius.lg` / `radius.button` / `radius.sm` | 28 / 18 / 14 | card, button, URL block |

Type is Poppins, Light 300 for prose and SemiBold 600 for the button and
wordmark, matching `theme.fonts`.

## Email client constraints, so these are not "tidied" later

* **Tables, not flex or grid.** Outlook ignores both.
* **Inline styles only.** Gmail strips `<style>` blocks.
* **The button gradient is a `background-image` over a solid
  `background-color`.** Outlook shows the solid `#FD5B01`, everything else shows
  the gradient. Both are correct.
* **`border-radius` is ignored by Outlook desktop**, which draws square corners.
  Accepted.
* **The web font is linked, not embedded.** Apple Mail and iOS Mail honour it.
  Everywhere else falls back to the system sans stack, which is fine.
* **The whole button is the link**, as a `display: block` anchor with 18px
  padding, giving a tap target about 56px tall instead of a line of text.

## Not done here

The browser still opens before the app when you tap the link, because Supabase
has to validate the token on its own server first. Removing that hop needs a
`{{ .TokenHash }}` template pointing at a universal link on `app.choner.io`,
which does not resolve yet. See `docs/DECISIONS_LOG.md` for the detail. It is
cosmetic, and it is not what these templates are for.
