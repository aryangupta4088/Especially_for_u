# Especially For U

A dreamy, premium-handmade e-commerce site for a student-run creative studio in Muradnagar. It includes the visual storefront plus an Express REST backend with managed-MySQL persistence, server-side order pricing, custom-request validation, delivery/settings APIs, protected admin endpoints and notification placeholders.

## Run locally

```bash
npm install
npm run dev

# in a second terminal for the API
npm run server
```

The Webdev runtime uses port `3000`.

## Prototype routes

`/` · `/shop` · `/category/:slug` · `/occasion/:occasion` · `/product/:slug` · `/custom-request` · `/cart` · `/checkout` · `/account` · `/account/requests/:id` · `/track-order` · `/about` · `/pages/:slug` · `/admin`

## Data seam

The seed catalogue lives in `src/mockData.js`; the storefront uses the API when the backend and database are available, with seed content as a local fallback.

## Revised prompt coverage

- Product actions create a custom request linked to the selected item. Customers can attach reference images or videos and continue the conversation in their account.
- Checkout includes Muradnagar area selection, KIET handover spots, home-delivery slots, “Other location in Muradnagar” manual approval messaging, ready-by guidance, Indian phone labeling, gift recipient/message/hide-sender/gift-wrap fields, policy consent and payment-plan explanations.
- Studio Admin has one independent sign-in, owner-managed team accounts, product editing and scheduled discounts, customer chats and quotes, order status, and manually verified payment balances.
- Payments use a 50% UPI advance and a manually recorded balance. Add the QR image and UPI ID in Admin → Payment Setup.
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

The API is in `server/` and uses MySQL when `DATABASE_URL` is available, with a memory fallback for local development. Run `npm run db:migrate` before using the new chat, payment and sale features on the managed database. Configure `JWT_SECRET`, `GOOGLE_CLIENT_ID`, owner `ADMIN_1_*` settings and a persistent `UPLOAD_DIR` on the host. See [`server/README.md`](server/README.md) for setup and storage details. `Dockerfile` builds the frontend and starts the API on `PORT` (default 3000).

Order notifications are intentionally **placeholders** right now: `.env.example` leaves `NOTIFICATIONS_ENABLED=false` and `ORDER_NOTIFICATION_EMAIL` empty. An email address alone is not an outbound email service; enable the built-in owner alert path only after choosing it, or configure a real customer-email provider through protected project secrets. See [`server/README.md`](server/README.md) for API routes and the notification boundary.
