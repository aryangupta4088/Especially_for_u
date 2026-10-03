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

The migration creates catalogue, settings, delivery, order, order-item, custom-request, notification-log and audit-log tables. It is additive and safe to rerun with the managed MySQL database.

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

Admin endpoints require `Authorization: Bearer $ADMIN_API_TOKEN`. They return `501 ADMIN_AUTH_NOT_CONFIGURED` until the real authentication layer is connected; no fake admin bypass is used.

## Notifications

Notifications are intentionally disabled in `.env.example`. A recipient email address can be stored in `ORDER_NOTIFICATION_EMAIL` later, but an email address alone does not provide an outbound email transport. The code supports the built-in Manus owner notification path only when `NOTIFICATIONS_ENABLED=true` and `EMAIL_PROVIDER=manus-owner`; it never routes customer email through that owner-only endpoint. Add a real customer-email provider through protected project secrets before enabling order confirmations.
