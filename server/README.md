# Especially For U backend

The backend is an Express REST API with a repository boundary that uses the managed MySQL database when `DATABASE_URL` is present and a deterministic in-memory fallback for local UI development.

## Run locally

```bash
npm run server
# listens on http://127.0.0.1:4000 by default
```

The Vite dev server proxies `/api/*` to port 4000. The production server serves `dist/` and uses `PORT` (default 3000).

## Database

```bash
npm run db:migrate
npm run db:seed
```

The migrations create catalogue, settings, delivery, order, order-item, custom-request, notification-log, audit-log, chat and payment tables. Migration `006_chat_payments_sales.sql` adds scheduled product sales, manual payment records, UPI settings and request chat metadata. Run migrations against the configured MySQL database before deploying the updated application; do not run the seeder on a database with live catalogue data unless you intend to refresh it.

## Admin access

The studio admin page is `/admin`. Configure the owner with `ADMIN_1_EMAIL`, `ADMIN_1_PASSWORD` and optionally `ADMIN_1_NAME` (up to five environment owners are supported). The owner can add or deactivate team accounts in Studio Team. Team accounts are created inside the admin area; public admin registration is disabled. Set a strong `JWT_SECRET` in production.

## Manual payments and media

In Admin → Payment Setup, upload the studio UPI QR image and enter the UPI ID and payment instructions. The customer reports payment from checkout or order tracking; an admin verifies the transfer and records the amount before the order balance changes. Customers pay 50% before work begins and the remaining amount before handover.

Set `UPLOAD_DIR` to a persistent writable directory on the hosting provider. Product images and request reference photos/videos are stored there; MySQL stores their URLs. Request media is limited to five files, each up to 8 MB. Admins can clear the chat and reference media after marking a request or order complete. Hosting with an ephemeral filesystem will lose these uploads on restart, so use a persistent volume.

## Google sign-in

Set `GOOGLE_CLIENT_ID` on the server and configure the matching authorized JavaScript origins in Google Cloud Console. Google sign-in remains unavailable until this is configured.

## API surface

- `GET /api/health`
- `GET /api/products?category=&occasion=&q=`
- `GET /api/categories`
- `GET /api/settings/public`
- `GET /api/delivery/areas`
- `POST /api/orders` — validates Indian phone numbers, recalculates pricing server-side, applies delivery/gift/payment policy and creates the order.
- `GET /api/orders/:id`
- `POST /api/custom-requests` — validates the request and preserves the linked product.
- `GET /api/admin/summary`
- `GET /api/admin/orders`
- `GET /api/admin/custom-requests`

Admin endpoints require the admin session token returned by `POST /api/admin/login`. Admin accounts are configured by the owner as described above.

## Notifications

Notifications are intentionally disabled in `.env.example`. A recipient email address can be stored in `ORDER_NOTIFICATION_EMAIL` later, but an email address alone does not provide an outbound email transport. The code supports the built-in Manus owner notification path only when `NOTIFICATIONS_ENABLED=true` and `EMAIL_PROVIDER=manus-owner`; it never routes customer email through that owner-only endpoint. Add a real customer-email provider through protected project secrets before enabling order confirmations.
