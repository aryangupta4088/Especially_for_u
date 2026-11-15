# AI Context: Especially For U

## 1. Project overview
Especially For U is a handmade-gifts storefront for a student-run studio in Muradnagar. It combines a React/Vite storefront and operations UI with an Express REST API, optional managed MySQL persistence, server-side order pricing, and optional Razorpay/notification integrations. The repository still uses a shared mock catalogue as a prototype/seed seam.

## 2. Stack and commands
- **Stack:** React, React Router, Vite, Tailwind/PostCSS, Node.js ESM, Express 5, Zod, MySQL (`mysql2`), JWT/bcrypt, optional Razorpay and Nodemailer.
- **Install:** `npm install`
- **Dev:** `npm run dev` (Vite port 3000); in another terminal `npm run server` (API port 4000 by default). Vite proxies `/api`.
- **Build:** `npm run build`; production: `npm start` (PORT or 3000).
- **Database:** `npm run db:migrate`, then `npm run db:seed` with MySQL config.
- **Test/lint/format/typecheck:** unknown; no scripts or test files were detected.
- **Deploy:** Dockerfile builds with Node 22 Alpine, omits dev dependencies, runs the Vite build, then starts Express; no platform-specific deploy command is configured.

## 3. Directory map
- `src/` — React application, styles, mock catalogue, contexts, route screens, and reusable components.
- `src/pages/` — authentication and reset-password screens; most storefront/admin screens remain in App.jsx.
- `src/context/` — shared authentication context and API actions.
- `src/components/` — route guard components.
- `server/` — Express API, authentication, validation/pricing, repository, payment and notification services.
- `server/migrations/` — ordered MySQL schema migrations.
- `public/` — public static assets and route manifest (uploads are created here at runtime).
- `.trae/documents/` — design/auth planning documents; may not reflect current runtime implementation.
- `.ai/` — generated repository graph/context/index.

## 4. Key entry points and main flows
- Browser entry: `src/main.jsx` mounts BrowserRouter and App. App.jsx declares the page routes, in-memory cart/wishlist, live-data context, and admin UI.
- API entry: `server/index.js` initializes middleware, repository, API routes, and production SPA fallback.
- Dev flow: Vite at 3000 proxies `/api` to Express at 4000. Production Express serves `dist/`.
- Order flow: authenticated `POST /api/orders` -> Zod parse -> server catalog/settings pricing -> repository persistence -> optional payment and notifications. Client totals are not authoritative.
- Custom work: authenticated `POST /api/custom-requests` validates request details and preserves optional product link.

## 5. Core modules and responsibilities
- `src/App.jsx`: route map, storefront/admin screens and shared UI; top-level cart and wishlist are React state (not durable across reloads).
- `src/mockData.js` / `server/catalog.js`: prototype content and backend catalogue projection/seed inputs.
- `src/context/AuthContext.jsx`: user token/data in localStorage and auth API actions; `ProtectedRoute.jsx` gates client views.
- `server/index.js`: request orchestration and all REST route declarations.
- `server/pricing.js`: Zod schemas and server-calculated order subtotal, delivery/gift fees, advances, and balances.
- `server/repository.js`: memory and MySQL implementations plus connection-failure fallback.
- `server/auth.js`: user/admin JWTs, guards, password login/reset, and Google identity flow.
- `server/payments.js` / `server/notifications.js`: optional Razorpay and email/owner notification integrations.

## 6. Data models and API routes
- **MySQL tables:** site_settings, products, categories, delivery_areas, delivery_slots, orders, order_items, custom_requests, users, password_reset_tokens, order_queries, notification_logs, audit_logs. Memory fallback is non-durable.
- **API route families:** health; products/categories/settings/delivery; orders and order queries; custom requests; auth register/login/Google/reset/me; payment verify/webhook; protected admin login/me, summary, orders, custom requests, settings, products/categories, uploads, audit and notification logs. Exact paths are listed in project_graph.json.
- **Client paths:** home, login/signup/reset, shop/category/occasion/product, custom request, cart/checkout, account/request detail, tracking, about/content pages, admin. Most storefront routes except home/auth are protected in source.

## 7. Dependency graph summary
The client imports shared mock data and auth context; App coordinates pages and calls API endpoints. The API imports the repository, pricing, auth, catalog, payments, and notifications modules. Catalog adapts src/mockData.js; repository uses db.js and MySQL when configured, otherwise memory. Migrations and seed data provide MySQL persistence. npm external dependency nodes and file-level import edges are in project_graph.json; import relationships are heuristic and confidence-tagged.

## 8. How to make common changes
- **New API route:** add handler in server/index.js, use appropriate JWT middleware, validate inputs with Zod, and access persistence through repository.js. Update server/README.md.
- **New page/component:** add/wire route in src/App.jsx (or place screen in src/pages/), reuse contexts/design tokens, and update public/manus-routes.json if required.
- **New model/migration:** add the next numbered additive SQL migration; implement both memory and MySQL repository methods; update seed/catalog if needed; run migrate then seed.
- **New service:** add an ESM server module, wire it through its owning module, handle failures explicitly, and document required variable names without secret values.
- **Test:** no runner is configured; introduce a test framework/script before adding tests, prioritizing pricing, auth guards, and repository behavior.
- **Configuration:** edit package/Vite/Tailwind/PostCSS/Docker settings as appropriate; never include .env or key material.

## 9. Conventions, gotchas, and warnings
- Use ESM and named exports on the backend; API handlers generally forward errors via Express next(error). Validate inputs with Zod and keep order pricing server-side.
- Mock catalogue is shared with server seed logic, not a substitute for persistent order/customer data. Cart/wishlist live only in memory.
- MySQL is enabled by DATABASE_URL or DB_HOST; DB outage causes per-operation in-memory fallback, so fallback writes are not durable and data can split. Migrations catch statement failures and continue; inspect logs/schema rather than trusting exit status alone.
- A fallback development JWT secret is present; set strong production secrets. Google login handler accepts identity fields and should not be treated as verified identity without a trusted token check.
- Notifications are optional/placeholders; customer email delivery and owner alerts have distinct constraints. Keep disabled until a real provider is configured.
- TODO/planning documents describe desired or older state; source and package scripts are authoritative. No test/lint/format/typecheck tooling or background job runner was found.

## 10. How future agents should use this file
Start with this context for orientation, then consult project_graph.json for exact paths, route nodes, symbols, imports, and confidence. Verify source before making behavioral changes; generated summaries are heuristic and can become stale. Rebuild these artifacts after substantial architecture changes, and never inspect or copy secret values from environment files.
