# Authentication System Implementation Plan

## Repository Research

**Current State Analysis:**

1. **Routing Issue**: The app in [App.jsx](file:///Users/aryangupta/Downloads/especiallyu/src/App.jsx#L422-L443) has no route guards. Visiting `/` loads `HomePage` immediately — anyone can see the website without logging in.

2. **No User Auth System**: 
   - [auth.js](file:///Users/aryangupta/Downloads/especiallyu/server/auth.js) only supports admin login (via `.env` admin accounts), NOT regular user registration/login.
   - No Google OAuth, no forgot password, no user registration endpoints.
   - Migration [001_initial.sql](file:///Users/aryangupta/Downloads/especiallyu/server/migrations/001_initial.sql) has NO `users` table — no place to store regular customer accounts.

3. **Static Data**: Frontend imports everything from [mockData.js](file:///Users/aryangupta/Downloads/especiallyu/src/mockData.js) — products, categories, settings, reviews all hardcoded, never fetched from the API.

4. **Database**: `.env` has `DATABASE_URL=mysql://root:aryan@localhost:3306/especially_for_u`. The repository layer in [repository.js](file:///Users/aryangupta/Downloads/especiallyu/server/repository.js) has both `memoryRepository` (fallback) and `mysqlRepository` but no users table means no user persistence.

5. **Available Stack**: Already has `bcryptjs`, `jsonwebtoken`, `nodemailer`, `mysql2`, `react-router-dom` — all dependencies we need.

**User Requirements:**
- Different flows for first-time/user login vs admin login
- Minimalistic login/signup page + Google sign-in option (visual button, real OAuth optional)
- Forgot password system (email-based reset token)
- Landing page must NOT show home page without login — redirect to auth page
- Check/fix database connectivity
- Replace static frontend data with real API calls (at minimum, show it working)

---

## Files and Modules

### New Files to Create
- `server/migrations/002_add_users_and_password_resets.sql` — Users, password_reset_tokens tables
- `src/pages/AuthPage.jsx` — Minimal login/signup/forgot password UI component
- `src/pages/ResetPasswordPage.jsx` — Password reset form from email link
- `src/context/AuthContext.jsx` — React auth state (user token, login/logout helpers)
- `src/components/ProtectedRoute.jsx` — Route guard wrapper

### Files to Modify
- `server/auth.js` — Add user registration, user login, forgot password, reset password, Google token auth, JWT middleware for users
- `server/index.js` — Add public auth endpoints (register, login, forgot-password, reset-password, google-login), add auth middleware where needed
- `server/repository.js` — Add `createUser`, `getUserByEmail`, `getUserById`, `createPasswordResetToken`, `consumePasswordResetToken`, `updatePassword`
- `src/App.jsx` — Add route guards, wrap with AuthProvider, add `/login`, `/signup`, `/forgot-password`, `/reset-password` routes; redirect `/` to `/login` if unauthenticated
- `src/main.jsx` — Optionally move BrowserRouter setup (minor)
- `src/mockData.js` — No delete; just stop importing it where API calls replace it

---

## Implementation Steps (Dependency Order)

### Step 1 — Check Database Connectivity
Run the existing migration and seed scripts against the configured MySQL to verify the connection works:
```
node server/migrate.js
node server/seed.js
curl http://localhost:4000/api/health
```
Record `repository` in response — should say `managed-mysql`, not `memory-fallback`. If it falls back, diagnose `.env` DATABASE_URL / MySQL server status.

### Step 2 — Add Users & Password Reset Schema
Create `002_add_users_and_password_resets.sql` migration with:
- `users` table: id, email (unique), password_hash, name, phone, role (USER/ADMIN), google_id nullable, created_at, updated_at
- `password_reset_tokens` table: id, user_id FK, token (unique hash), expires_at, used_at, created_at
Run migration.

### Step 3 — Extend Repository Layer
In `repository.js` (both memory and mysql repos), add methods:
- `createUser({ email, passwordHash, name, phone, role })` → return user (strip hash)
- `getUserByEmail(email)` → user object WITH passwordHash (for login only)
- `getUserById(id)` → user (no hash)
- `createPasswordResetToken(userId, tokenHash, expiresAt)`
- `findPasswordResetToken(tokenHash)` → { token, userId, expiresAt, usedAt } or null
- `consumePasswordResetToken(tokenHash)` → mark used_at
- `updatePassword(userId, newPasswordHash)`

### Step 4 — Implement User Auth Backend (auth.js + index.js)
Extend `auth.js` with:
- `registerUser({ email, password, name, phone })` — bcrypt hash, save, return JWT
- `authenticateUser(email, password)` — compare bcrypt, return JWT
- `requireUserJWT` middleware (separate from `requireAdminJWT` — different claim shapes)
- `generatePasswordResetToken(email)` — create + email token via nodemailer (already in deps)
- `resetPasswordWithToken(token, newPassword)` — verify token, update password
- `verifyGoogleTokenAndUpsert(idToken)` — stub that either uses Google OAuth2 verify library or accepts a test payload (keeps the UI flow working without a real Google Cloud project)

Add routes to `index.js`:
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/google
GET  /api/auth/me       (requireUserJWT)
```

### Step 5 — Frontend Auth Context + Protected Routes
- Create `AuthContext.jsx`: stores `user`, `token`, `login()`, `register()`, `logout()`, `forgotPassword()`, `resetPassword()`, `googleLogin()`; persists in localStorage; exposes a `useAuth()` hook
- Create `ProtectedRoute.jsx`: if no user token → `<Navigate to="/login" />`; otherwise render children

### Step 6 — Minimalistic Auth UI Page
Create `AuthPage.jsx` with 3 sub-modes (tabs or toggle):
- **Login** form (email + password) + Google button + "Forgot password?" link + "Admin login →" link
- **Signup** form (name, email, phone, password, confirm password) + Google button
- **Forgot Password** email input + submit → shows success message

Create `ResetPasswordPage.jsx`: reads `?token=` from URL, new password + confirm, submit.

Design follows the existing aesthetic (GlassCard, floating fields, EFU wordmark/colors, minimal, soft). No heavy decoration.

### Step 7 — Update App Routing to Enforce Login
In `App.jsx`:
- Wrap everything inside `<AuthProvider>`
- Wrap existing page routes (`HomePage`, `ShopPage`, etc.) in `<ProtectedRoute>` — only the auth pages themselves remain public
- Default route `/` now behaves: if logged in → HomePage; if not → `<Navigate to="/login" />`
- Add routes:
  - `/login` → AuthPage (login mode)
  - `/signup` → AuthPage (signup mode)
  - `/forgot-password` → AuthPage (forgot mode)
  - `/reset-password` → ResetPasswordPage
- Admin login remains on `/admin` (already implemented; keep separate from user auth as requested)

### Step 8 — Replace Top Static Data with API Fetch (Minimum Viable Integration)
In `App.jsx`, `HomePage`, `ShopPage`, etc. — change hardcoded `products`, `categories`, `deliveryAreas`, `storeSettings` to be loaded via `useEffect` + `fetch('/api/products|categories|settings/public|delivery/areas')` on mount. Keep `mockData.js` as a fallback so UI doesn't break if request fails; this demonstrates real connectivity without a full refactor.

### Step 9 — Validate Everything
1. Database: health endpoint shows `managed-mysql`
2. Migration ran without errors; `users` table exists
3. Register → login flow works via UI; JWT saved in localStorage
4. Protected routes redirect to `/login` when logged out; load when logged in
5. Admin login still works on `/admin` (independent of user login)
6. Forgot password sends email (or records in notification logs if email is disabled)
7. Reset link works; password actually changes
8. Google button in UI fires the flow (accepts stub token for demo)
9. Home page no longer accessible without login
10. No build/type errors: run `npm run build`, fix warnings

---

## Dependencies and Considerations

- **bcryptjs 3.x** — already installed; sync version fine for small user count
- **jsonwebtoken 9.x** — already installed; separate `USER_JWT_SECRET` env var not needed (reuse `JWT_SECRET` but include role claim so middleware can distinguish)
- **nodemailer** — already installed; reuses `GMAIL_USER` / `GMAIL_APP_PASSWORD` from `.env` for password reset emails. If app password is still `REPLACE_ME…`, log tokens to server console as a developer fallback so flow is testable
- **Google sign-in** — real Google OAuth requires Google Cloud client ID. Plan: render the button UI, do a client-side Google Sign-In (load `https://accounts.google.com/gsi/client` script + client ID from env) AND provide a fallback/demo path so the code works even without a real client ID configured. Add `GOOGLE_CLIENT_ID` to `.env.example`.
- **Role distinction** — Admin vs user auth are separate flows (as requested):
  - `/admin` → AdminLoginPage → admin JWT → dashboard (unchanged path)
  - `/login` → User AuthPage → user JWT → website
  - `requireAdminJWT` middleware keeps its own admin env-based logic; `requireUserJWT` looks up `users` table. No cross-use.
- **Protected-route coverage** — protect all customer-facing pages; `/about`, `/pages/*`, `/track-order` can optionally be public; we'll keep them behind login since user requested the website require login first. (If this is too strict we can relax specific routes later.)
- **Database fallback** — if MySQL isn't reachable, repository falls back to memory; ensure user auth still functions in memory mode so flow can be demo'd even without MySQL actually running

---

## Validation

1. `curl http://localhost:4000/api/health` → `repository: "managed-mysql"`
2. `node server/migrate.js` runs clean; `SHOW TABLES` includes `users`, `password_reset_tokens`
3. Register via `POST /api/auth/register { name, email, password, phone }` → 201 + JWT
4. Login via `POST /api/auth/login { email, password }` → 200 + JWT
5. `GET /api/auth/me` with Bearer → user info; without Bearer → 401
6. `POST /api/auth/forgot-password { email }` → email sent or token visible in server logs
7. `POST /api/auth/reset-password { token, password }` → password updated
8. Open browser, visit `http://localhost:<vite_port>/` → redirects to `/login`
9. After login → lands on HomePage normally
10. Visit `/admin` → admin login page (separate); logging in there does NOT grant user access to site (different tokens stored in different localStorage keys `efu_admin_token` vs `efu_user_token`)
11. `npm run build` → no errors

---

## Risks

| Risk | Handling |
|---|---|
| MySQL not actually running on user's machine | Verify connectivity Step 1 first; if it fails, memory-repo fallback keeps auth working for demo purposes; we will report findings in the summary |
| Gmail app password placeholder still set → password reset emails fail | Catch nodemailer errors; in dev fall back to printing the reset link to server console so flow works end-to-end |
| No Google Cloud client ID configured | Add env var `GOOGLE_CLIENT_ID`, if missing render the Google button but on click show a friendly message + demo mode (auto-create a demo Google-linked account) |
| Existing admin pages accidentally broken by new user middleware | Keep admin middleware path completely separate; admin routes remain untouched except that `/admin` route still renders AdminLoginPage as it did before — no shared middleware |
| Breaking the site by requiring login for ALL pages including marketing content | Document in validation; user specifically requested "when someone enters he/she first login" so this is intentional. We'll wrap `/about`, `/pages/*`, `/track-order` with a flag to make them public if needed (configurable in ProtectedRoute) |
