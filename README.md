# Especially For U

A handmade-gift storefront for a student-run creative studio in Muradnagar. Customers browse products and send product or custom inquiries through WhatsApp. Product links include the product name, ID and page URL in a prefilled WhatsApp message. The storefront displays no prices and does not offer cart, checkout or online payment.

## Run locally

```bash
npm install
npm run dev

# in a second terminal for the API
npm run server
```

The Webdev runtime uses port `3000`.

## Prototype routes

`/` · `/shop` · `/category/:slug` · `/occasion/:occasion` · `/product/:slug` · `/custom-request` · `/account` · `/about` · `/pages/:slug` · `/admin`

## Data seam

The seed catalogue lives in `src/mockData.js`; the storefront uses the API when the backend and database are available, with seed content as a local fallback.

## Revised prompt coverage

- Product actions prepare a WhatsApp inquiry linked to the selected item. Customers attach any reference images or videos directly in WhatsApp after it opens.
- Product inquiries open WhatsApp with the product name, ID, page link and selected options already filled in. Customers tap Send in WhatsApp to contact the studio.
- The custom idea form prepares a WhatsApp message with the visitor’s details and request description. Reference photos or videos are attached manually in WhatsApp after it opens.
- The public storefront does not expose product prices, cart or checkout. Historical order and payment records remain stored for reference; they are not shown in the storefront.
- Studio Admin has one independent sign-in, owner-managed team accounts, product and media management, reviews and historical order records.
- Policy pages and FAQ content are intentionally labelled starter copy requiring review before publishing.

## Design tokens

| Token | Value | Use |
|---|---|---|
| `--orchid` | `#CDB4DB` | Lavender gradients and tags |
| `--petal` | `#FFC8DD` | Soft pink surfaces |
| `--blush` | `#FFAFCC` | Signature CTA and highlights |
| `--icy` | `#BDE0FE` | Cool sections and trust callouts |
| `--sky` | `#A2D2FF` | Focus rings and links |
| `--ink` | `#3B2A4A` | Accessible primary text |
| `--muted` | `#6B5B7B` | Secondary text |
| `--paper` | `#FFFBFE` | Base and card surfaces |

Typography uses Fraunces for display headings and DM Sans for UI/body. Cards use 16–28px radii, soft plum shadows, and translucent glass surfaces. Standard motion is 300–450ms with `prefers-reduced-motion` fallbacks.

## Backend and production

The API is in `server/` and uses MySQL when `DATABASE_URL` is available, with a memory fallback for local development. Configure `JWT_SECRET`, owner `ADMIN_1_*` settings and Cloudinary credentials on the host. See [`server/README.md`](server/README.md) for setup and storage details. `Dockerfile` builds the frontend and starts the API on `PORT` (default 3000).

Order notifications are intentionally **placeholders** right now: `.env.example` leaves `NOTIFICATIONS_ENABLED=false` and `ORDER_NOTIFICATION_EMAIL` empty. An email address alone is not an outbound email service; enable the built-in owner alert path only after choosing it, or configure a real customer-email provider through protected project secrets. See [`server/README.md`](server/README.md) for API routes and the notification boundary.
