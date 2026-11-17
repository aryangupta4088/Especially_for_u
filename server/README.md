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

The studio admin page is `/admin`. It uses the same email/password sign-in page as customers: admins enter their admin credentials there and are routed to the Studio Desk. Configure the owner with `ADMIN_1_EMAIL`, `ADMIN_1_PASSWORD` and optionally `ADMIN_1_NAME` (up to five environment owners are supported). The owner can add or deactivate team accounts in Studio Team. Team accounts are created inside the admin area; public admin registration is disabled. Set a strong `JWT_SECRET` in production.

## Manual payments and media

In Admin → Payment Setup, upload the studio UPI QR image and enter the UPI ID and payment instructions. The customer reports payment from checkout or order tracking; an admin verifies the transfer and records the amount before the order balance changes. Customers pay 50% before work begins and the remaining amount before handover.

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in the backend environment to store product/category images, the payment QR, and customer request images/videos in Cloudinary. MySQL stores the secure Cloudinary URLs; the API secret stays server-side and must never be added to frontend variables. Request media is limited to five files, each up to 8 MB. Admins can clear the chat and reference media after marking a request or order complete; clearing also deletes those Cloudinary assets. If Cloudinary credentials are absent, local development falls back to `UPLOAD_DIR` (default `public/uploads`). Existing local files are not moved automatically; upload them again after configuring Cloudinary, or keep the old files available until migrated.

## Email verification

Email/password signups receive a 6-digit code by email. The code expires after 10 minutes, is stored as a hash, and permits at most five attempts. For Railway, configure the Brevo transactional email API with `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY` and `EMAIL_FROM` (a verified, active Brevo sender). Keep these values in backend environment variables; do not use frontend `VITE_` variables. Brevo sends over HTTPS, so SMTP egress is not required. Gmail is also supported with `EMAIL_PROVIDER=gmail`, `GMAIL_USER` and `GMAIL_APP_PASSWORD`; it uses IPv4 SMTP with STARTTLS on port 587, which requires outbound SMTP access. Set `APP_BASE_URL` to the deployed website origin (for example, `https://your-domain.example`) so password-reset links point to the live site. Local development defaults to `http://localhost:3000`; production will not send a reset link until `APP_BASE_URL` is set. Apply migration `007_email_verification.sql` before enabling the updated signup flow.

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
