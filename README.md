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

The storefront still keeps `src/mockData.js` as its intentional prototype content seam. The backend imports the catalogue for deterministic seed data and exposes the same concepts through `/api/products`, `/api/orders` and `/api/custom-requests`; replace the frontend seam with API hooks when wiring authenticated production sessions.

## Revised prompt coverage

- Every product card and product page includes **Request Custom Version** and preserves the originating product in the request flow.
- Checkout includes Muradnagar area selection, KIET handover spots, home-delivery slots, “Other location in Muradnagar” manual approval messaging, ready-by guidance, Indian phone labeling, gift recipient/message/hide-sender/gift-wrap fields, policy consent and payment-plan explanations.
- The Studio desk now surfaces **Needs attention**, location approvals, balances, quote expiry, payment reconciliation, delivery areas/slots, store pause and capacity controls, editable CMS pages/FAQs, roles, audit log, notifications, reports/CSV exports and TEST MODE.
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

The API is in `server/` and uses the managed MySQL `DATABASE_URL` when available, with a memory fallback for local development. Run `npm run db:migrate && npm run db:seed` before using managed persistence. `Dockerfile` builds the frontend and starts the API on `PORT` (default 3000).

Order notifications are intentionally **placeholders** right now: `.env.example` leaves `NOTIFICATIONS_ENABLED=false` and `ORDER_NOTIFICATION_EMAIL` empty. An email address alone is not an outbound email service; enable the built-in owner alert path only after choosing it, or configure a real customer-email provider through protected project secrets. See [`server/README.md`](server/README.md) for API routes and the notification boundary.
