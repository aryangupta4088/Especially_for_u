import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { catalogProducts } from './catalog.js';
import { createRepository, newEntityId } from './repository.js';
import { calculateOrder, customRequestSchema, orderInputSchema } from './pricing.js';
import { notificationConfig, notifyNewOrder, notifyNewCustomRequest, sendOrderConfirmation } from './notifications.js';
import {
  authenticateAdmin, requireAdminJWT, authConfig,
  registerUser, registerAdmin, authenticateUser, authenticateGoogle,
  requireUserJWT, optionalUserJWT,
  generatePasswordResetToken, resetPasswordWithToken,
} from './auth.js';
import { paymentConfig, createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature } from './payments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const repository = createRepository();
const port = Number(process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 4000));

(async function testDbConnection() {
  const pool = (await import('./db.js')).getPool();
  if (!pool) return;
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    console.log('[db] Connected to managed MySQL (Aiven compatible). Pool size = ' + (pool.config?.connectionLimit || 5));
  } catch (err) {
    console.error('[db-connect-error] Could not connect to database:', err.message);
    console.error('[db-connect-error] Code:', err.code, '| Check DATABASE_URL / DB_HOST / DB_USER / DB_PASSWORD / DB_NAME / DB_SSL_CA in .env');
    console.error('[db-connect-error] Aiven requires SSL — make sure ca.pem is at the project root or set DB_SSL_CA path.');
    console.error('[db-connect-error] Falling back to in-memory store (data will not persist).');
  }
})();

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '20mb' }));

const UPLOAD_DIR = path.resolve(__dirname, '../public/uploads');
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});

async function saveBase64Image(b64, filenameHint = 'upload') {
  if (!b64) return null;
  let data = b64;
  let mime = 'image/png';
  const match = /^data:(image\/[a-z0-9+\-.]+);base64,(.*)$/is.exec(b64);
  if (match) {
    mime = match[1];
    data = match[2];
  }
  const ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
  const filename = `${filenameHint}-${randomUUID().slice(0, 8)}.${ext}`;
  const full = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(full, Buffer.from(data, 'base64'));
  return `/uploads/${filename}`;
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════════════

app.get('/api/health', async (_request, response) => response.json({
  ok: true,
  service: 'especially-for-u-api',
  repository: repository.mode,
  notifications: notificationConfig(),
  payments: paymentConfig(),
  auth: authConfig(),
  timestamp: new Date().toISOString(),
}));

app.get('/api/products', async (request, response, next) => {
  try {
    const products = await repository.listProducts({ category: request.query.category, occasion: request.query.occasion, q: request.query.q });
    return response.json({ products });
  } catch (error) { return next(error); }
});

app.get('/api/categories', async (_request, response, next) => {
  try { return response.json({ categories: await repository.listCategories() }); }
  catch (error) { return next(error); }
});

app.get('/api/settings/public', async (_request, response, next) => {
  try {
    const settings = await repository.getPublicSettings();
    const payment = paymentConfig();
    return response.json({
      settings: {
        ...settings,
        razorpayKeyId: payment.keyId,
        razorpayTestMode: payment.testMode,
        paymentConfigured: payment.configured,
      },
    });
  } catch (error) { return next(error); }
});

app.get('/api/delivery/areas', async (_request, response, next) => {
  try { return response.json({ areas: await repository.listDeliveryAreas(), slots: await repository.listDeliverySlots() }); }
  catch (error) { return next(error); }
});

// ── Order creation (protected) ────────────────────────────────────────
app.post('/api/orders', requireUserJWT, async (request, response, next) => {
  try {
    const input = orderInputSchema.parse(request.body);
    const pricing = calculateOrder(input, catalogProducts, await repository.getPublicSettings());
    const orderId = newEntityId('EFU');
    const order = {
      id: orderId,
      userId: request.user.sub,
      status: pricing.advanceDue > 0 ? 'PENDING_PAYMENT' : 'PENDING_CONFIRMATION',
      customer: input.customer,
      delivery: input.delivery,
      gift: input.gift,
      pricing,
    };

    const saved = await repository.createOrder(order);

    // Create Razorpay order if advance is due
    let paymentOrder = null;
    if (pricing.advanceDue > 0) {
      try {
        paymentOrder = await createRazorpayOrder({
          amount: pricing.advanceDue,
          receipt: orderId,
          notes: { orderId, customerName: input.customer.name, customerPhone: input.customer.phone },
        });
      } catch (paymentError) {
        console.error('[payment-error]', paymentError.message);
        paymentOrder = { status: 'error', message: paymentError.message };
      }
    }

    // Send notifications (non-blocking)
    let notification;
    try {
      notification = await notifyNewOrder(saved);
      await repository.logNotification({
        eventType: 'new_order', recipient: process.env.ORDER_NOTIFICATION_EMAIL || '',
        channel: 'email', status: notification.status, error: notification.message || '',
      });
    } catch (notificationError) {
      notification = { status: 'failed', message: notificationError.message };
    }

    // Send customer confirmation (non-blocking)
    try { await sendOrderConfirmation(saved); } catch { /* silent */ }

    return response.status(201).json({ order: saved, payment: paymentOrder, notification });
  } catch (error) { return next(error); }
});

// ── Payment verification (protected) ──────────────────────────────────
app.post('/api/payments/verify', requireUserJWT, async (request, response, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = request.body;

    if (!orderId) {
      return response.status(400).json({ error: 'MISSING_ORDER_ID', message: 'orderId is required.' });
    }

    const result = verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

    if (result.verified) {
      const updated = await repository.updatePaymentStatus(orderId, 'PAID', razorpay_payment_id);
      if (updated) {
        // Send customer confirmation after payment
        const fullOrder = await repository.getOrderWithItems(orderId);
        if (fullOrder) {
          try { await sendOrderConfirmation(fullOrder); } catch { /* silent */ }
        }
      }
      return response.json({ verified: true, mock: result.mock, order: updated });
    }

    return response.status(400).json({ verified: false, error: 'SIGNATURE_MISMATCH', message: 'Payment verification failed.' });
  } catch (error) { return next(error); }
});

// ── Razorpay webhook ───────────────────────────────────────────────────
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (request, response, next) => {
  try {
    const signature = request.headers['x-razorpay-signature'];
    const body = typeof request.body === 'string' ? request.body : request.body.toString();

    if (!verifyWebhookSignature(body, signature)) {
      return response.status(400).json({ error: 'INVALID_SIGNATURE' });
    }

    const event = JSON.parse(body);

    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (payment?.notes?.orderId) {
        await repository.updatePaymentStatus(payment.notes.orderId, 'PAID', payment.id);
      }
    }

    return response.json({ status: 'ok' });
  } catch (error) { return next(error); }
});

app.get('/api/orders', requireUserJWT, async (request, response, next) => {
  try {
    const orders = await repository.listOrdersByUser(request.user.sub);
    return response.json({ orders });
  } catch (error) { return next(error); }
});

app.get('/api/orders/:id', requireUserJWT, async (request, response, next) => {
  try {
    const order = await repository.getOrderWithItems(request.params.id);
    if (!order) return response.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'We could not find that order.' });
    if (order.user_id && order.user_id !== request.user.sub && !order.userId) {
      // allow if user_id column is not set yet (backward compat)
    } else if ((order.userId || order.user_id) && (order.userId || order.user_id) !== request.user.sub) {
      return response.status(403).json({ error: 'FORBIDDEN', message: 'This order does not belong to you.' });
    }
    return response.json({ order });
  } catch (error) { return next(error); }
});

// ── Order Queries (user side) ──────────────────────────────────────────
app.post('/api/orders/:id/queries', requireUserJWT, async (request, response, next) => {
  try {
    const order = await repository.getOrder(request.params.id);
    if (!order) return response.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'We could not find that order.' });
    if ((order.userId || order.user_id) && (order.userId || order.user_id) !== request.user.sub) {
      return response.status(403).json({ error: 'FORBIDDEN', message: 'This order does not belong to you.' });
    }
    const { message } = request.body || {};
    if (!message || !String(message).trim()) {
      return response.status(400).json({ error: 'MISSING_MESSAGE', message: 'Query message is required.' });
    }
    const saved = await repository.createOrderQuery({
      orderId: request.params.id,
      userId: request.user.sub,
      message: String(message).trim(),
    });
    return response.status(201).json({ query: saved });
  } catch (error) { return next(error); }
});

app.get('/api/orders/:id/queries', requireUserJWT, async (request, response, next) => {
  try {
    const order = await repository.getOrder(request.params.id);
    if (!order) return response.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'We could not find that order.' });
    if ((order.userId || order.user_id) && (order.userId || order.user_id) !== request.user.sub) {
      return response.status(403).json({ error: 'FORBIDDEN', message: 'This order does not belong to you.' });
    }
    return response.json({ queries: await repository.listOrderQueriesByOrder(request.params.id) });
  } catch (error) { return next(error); }
});

// ── Custom requests (protected) ───────────────────────────────────────
app.post('/api/custom-requests', requireUserJWT, async (request, response, next) => {
  try {
    const input = customRequestSchema.parse(request.body);
    const product = catalogProducts.find((candidate) => candidate.id === input.productId);
    const requestRecord = { ...input, id: newEntityId('CR'), productName: product?.name || '', status: 'NEW' };
    const saved = await repository.createCustomRequest(requestRecord);

    try {
      await notifyNewCustomRequest(saved);
      await repository.logNotification({
        eventType: 'new_custom_request', recipient: process.env.ORDER_NOTIFICATION_EMAIL || '',
        channel: 'email', status: 'sent',
      });
    } catch { /* silent */ }

    return response.status(201).json({ request: saved, message: 'Request received. We will review the idea and send a manual quote.' });
  } catch (error) { return next(error); }
});

// ═══════════════════════════════════════════════════════════════════════
// USER AUTH PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════════════

app.post('/api/auth/register', async (request, response, next) => {
  try {
    const { email, password, name, phone } = request.body || {};
    if (!email || !password || !name) {
      return response.status(400).json({ error: 'MISSING_FIELDS', message: 'Name, email and password are required.' });
    }
    const result = await registerUser(repository, { email, password, name, phone });
    return response.status(201).json(result);
  } catch (error) {
    if (error.code === 'EMAIL_TAKEN') return response.status(409).json({ error: 'EMAIL_TAKEN', message: error.message });
    return next(error);
  }
});

app.post('/api/auth/admin-register', async (request, response, next) => {
  try {
    const { email, password, name, phone, adminPassword } = request.body || {};
    if (!email || !password || !name) {
      return response.status(400).json({ error: 'MISSING_FIELDS', message: 'Name, email and password are required.' });
    }
    if (!adminPassword) {
      return response.status(400).json({ error: 'MISSING_ADMIN_PASSWORD', message: 'Admin signup password is required.' });
    }
    const result = await registerAdmin(repository, { email, password, name, phone, adminPassword });
    return response.status(201).json(result);
  } catch (error) {
    if (error.code === 'EMAIL_TAKEN') return response.status(409).json({ error: 'EMAIL_TAKEN', message: error.message });
    if (error.code === 'INVALID_ADMIN_PASSWORD') return response.status(403).json({ error: error.code, message: error.message });
    return next(error);
  }
});

app.post('/api/auth/login', async (request, response, next) => {
  try {
    const { email, password } = request.body || {};
    if (!email || !password) {
      return response.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Email and password are required.' });
    }
    const result = await authenticateUser(repository, email, password);
    if (!result) {
      return response.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }
    return response.json(result);
  } catch (error) {
    if (error.code === 'ACCOUNT_DISABLED') return response.status(403).json({ error: error.code, message: error.message });
    return next(error);
  }
});

app.post('/api/auth/google', async (request, response, next) => {
  try {
    const { credential, googleId, email, name, avatarUrl, _demo } = request.body || {};
    let payload = { googleId, email, name, avatarUrl };
    if (credential) {
      try {
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const json = JSON.parse(Buffer.from(base64, 'base64').toString());
        payload = {
          googleId: json.sub || googleId,
          email: json.email || email,
          name: json.name || name,
          avatarUrl: json.picture || avatarUrl,
        };
      } catch { /* parse failed; fall back to explicit fields */ }
    }
    if (!payload.googleId) {
      if (_demo) {
        payload.googleId = `demo-${email || randomUUID().slice(0, 8)}`;
      } else {
        return response.status(400).json({ error: 'MISSING_GOOGLE_ID', message: 'Google sign-in needs a valid credential or googleId.' });
      }
    }
    const result = await authenticateGoogle(repository, payload);
    return response.json(result);
  } catch (error) { return next(error); }
});

app.get('/api/auth/config', async (_request, response) => {
  const cfg = authConfig();
  return response.json({ googleClientId: cfg.googleClientId, userAuth: cfg.userAuth });
});

app.post('/api/auth/forgot-password', async (request, response, next) => {
  try {
    const { email } = request.body || {};
    if (!email) return response.status(400).json({ error: 'MISSING_EMAIL', message: 'Email is required.' });
    const result = await generatePasswordResetToken(repository, email);
    return response.json(result);
  } catch (error) { return next(error); }
});

app.post('/api/auth/reset-password', async (request, response, next) => {
  try {
    const { token, password } = request.body || {};
    if (!token || !password) return response.status(400).json({ error: 'MISSING_FIELDS', message: 'Token and new password are required.' });
    if (password.length < 6) return response.status(400).json({ error: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters.' });
    await resetPasswordWithToken(repository, token, password);
    return response.json({ ok: true, message: 'Password updated. You can now log in.' });
  } catch (error) {
    if (error.code) return response.status(400).json({ error: error.code, message: error.message });
    return next(error);
  }
});

app.get('/api/auth/me', requireUserJWT, async (request, response, next) => {
  try {
    const user = await repository.getUserById(request.user.sub);
    if (!user) return response.status(404).json({ error: 'USER_NOT_FOUND' });
    return response.json({ user });
  } catch (error) { return next(error); }
});

// ═══════════════════════════════════════════════════════════════════════
// ADMIN AUTH
// ═══════════════════════════════════════════════════════════════════════

app.post('/api/admin/login', async (request, response, next) => {
  try {
    const { email, password } = request.body;
    if (!email || !password) {
      return response.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Email and password are required.' });
    }

    const result = await authenticateAdmin(email, password);
    if (!result) {
      return response.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }

    return response.json({ token: result.token, admin: result.admin });
  } catch (error) { return next(error); }
});

app.get('/api/admin/me', requireAdminJWT, (request, response) => {
  return response.json({ admin: request.admin });
});

// ═══════════════════════════════════════════════════════════════════════
// ADMIN PROTECTED ROUTES
// ═══════════════════════════════════════════════════════════════════════

app.get('/api/admin/summary', requireAdminJWT, async (_request, response, next) => {
  try { return response.json({ summary: await repository.adminSummary() }); }
  catch (error) { return next(error); }
});

app.get('/api/admin/orders', requireAdminJWT, async (_request, response, next) => {
  try { return response.json({ orders: await repository.listOrders() }); }
  catch (error) { return next(error); }
});

app.get('/api/admin/orders/:id', requireAdminJWT, async (request, response, next) => {
  try {
    const order = await repository.getOrderWithItems(request.params.id);
    if (!order) return response.status(404).json({ error: 'ORDER_NOT_FOUND' });
    return response.json({ order });
  } catch (error) { return next(error); }
});

app.patch('/api/admin/orders/:id/status', requireAdminJWT, async (request, response, next) => {
  try {
    const { status } = request.body;
    const validStatuses = ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      return response.status(400).json({ error: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` });
    }
    const updated = await repository.updateOrderStatus(request.params.id, status, request.admin?.email || 'admin');
    if (!updated) return response.status(404).json({ error: 'ORDER_NOT_FOUND' });
    return response.json({ order: updated });
  } catch (error) { return next(error); }
});

app.patch('/api/admin/orders/:id/location', requireAdminJWT, async (request, response, next) => {
  try {
    const { approval } = request.body;
    if (!['APPROVED', 'REJECTED'].includes(approval)) {
      return response.status(400).json({ error: 'INVALID_APPROVAL', message: 'Approval must be APPROVED or REJECTED.' });
    }
    const updated = await repository.updateLocationApproval(request.params.id, approval, request.admin?.email || 'admin');
    if (!updated) return response.status(404).json({ error: 'ORDER_NOT_FOUND' });
    return response.json({ order: updated });
  } catch (error) { return next(error); }
});

app.patch('/api/admin/orders/:id/estimated-date', requireAdminJWT, async (request, response, next) => {
  try {
    const { estimatedDate } = request.body || {};
    const updated = await repository.updateOrderEstimatedDate(request.params.id, estimatedDate || null, request.admin?.email || 'admin');
    if (!updated) return response.status(404).json({ error: 'ORDER_NOT_FOUND' });
    return response.json({ order: updated });
  } catch (error) { return next(error); }
});

// ── Admin Order Queries ────────────────────────────────────────────────
app.get('/api/admin/order-queries', requireAdminJWT, async (_request, response, next) => {
  try { return response.json({ queries: await repository.listAllOrderQueries() }); }
  catch (error) { return next(error); }
});

app.patch('/api/admin/order-queries/:id/reply', requireAdminJWT, async (request, response, next) => {
  try {
    const { reply } = request.body || {};
    if (!reply || !String(reply).trim()) {
      return response.status(400).json({ error: 'MISSING_REPLY', message: 'Reply text is required.' });
    }
    const updated = await repository.replyToOrderQuery(request.params.id, String(reply).trim(), request.admin?.email || 'admin');
    if (!updated) return response.status(404).json({ error: 'QUERY_NOT_FOUND' });
    return response.json({ query: updated });
  } catch (error) { return next(error); }
});

// ── Custom Requests Admin ──────────────────────────────────────────────
app.get('/api/admin/custom-requests', requireAdminJWT, async (_request, response, next) => {
  try { return response.json({ requests: await repository.listCustomRequests() }); }
  catch (error) { return next(error); }
});

app.get('/api/admin/custom-requests/:id', requireAdminJWT, async (request, response, next) => {
  try {
    const req = await repository.getCustomRequest(request.params.id);
    if (!req) return response.status(404).json({ error: 'REQUEST_NOT_FOUND' });
    return response.json({ request: req });
  } catch (error) { return next(error); }
});

app.patch('/api/admin/custom-requests/:id/status', requireAdminJWT, async (request, response, next) => {
  try {
    const { status, quote } = request.body;
    const validStatuses = ['NEW', 'REVIEWING', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_DECLINED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return response.status(400).json({ error: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` });
    }
    const updated = await repository.updateCustomRequestStatus(request.params.id, status, quote || null, request.admin?.email || 'admin');
    if (!updated) return response.status(404).json({ error: 'REQUEST_NOT_FOUND' });
    return response.json({ request: updated });
  } catch (error) { return next(error); }
});

// ── Settings ───────────────────────────────────────────────────────────
app.patch('/api/admin/settings', requireAdminJWT, async (request, response, next) => {
  try {
    const settings = await repository.updateSettings(request.body);
    return response.json({ settings });
  } catch (error) { return next(error); }
});

// ── Admin Product CRUD ─────────────────────────────────────────────────
app.get('/api/admin/products', requireAdminJWT, async (request, response, next) => {
  try {
    const limit = Math.min(Number(request.query.limit || 200), 500);
    const { category, q } = request.query;
    let list = [];
    if (repository.mode === 'managed-mysql') {
      const pool = (await import('./db.js')).getPool();
      const where = []; const params = [];
      if (category && category !== 'all') { where.push('category = ?'); params.push(category); }
      if (q) { where.push('(name LIKE ? OR description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
      const sql = `SELECT * FROM products ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY is_active DESC, sort_order, created_at DESC LIMIT ?`;
      const [rows] = await pool.query(sql, [...params, limit]);
      list = rows.map((row) => {
        let occasions = [];
        try { occasions = row.occasions_json ? (typeof row.occasions_json === 'string' ? JSON.parse(row.occasions_json) : row.occasions_json) : []; } catch { occasions = []; }
        let options = [];
        try { options = row.options_json ? (typeof row.options_json === 'string' ? JSON.parse(row.options_json) : row.options_json) : []; } catch { options = []; }
        return {
          id: row.id, slug: row.slug, name: row.name, category: row.category, type: row.type,
          price: row.price, originalPrice: row.original_price, production: row.production,
          description: row.description, image: row.image, badge: row.badge || '',
          occasions, audience: row.audience, premium: Boolean(row.premium),
          customizable: Boolean(row.customizable), allowCustomRequest: Boolean(row.allow_custom_request),
          isMadeToOrder: Boolean(row.is_made_to_order), returnable: Boolean(row.returnable),
          disclaimer: row.disclaimer, careInstructions: row.care_instructions,
          options, isActive: Boolean(row.is_active),
          sortOrder: row.sort_order, createdAt: row.created_at,
        };
      });
    } else {
      list = await repository.listProducts({ category, q });
      list = list.slice(0, limit);
    }
    return response.json({ products: list });
  } catch (error) { return next(error); }
});

app.get('/api/admin/products/:id', requireAdminJWT, async (request, response, next) => {
  try {
    const product = await repository.getProduct(request.params.id);
    if (!product) return response.status(404).json({ error: 'PRODUCT_NOT_FOUND' });
    return response.json({ product });
  } catch (error) { return next(error); }
});

app.post('/api/admin/products', requireAdminJWT, async (request, response, next) => {
  try {
    const body = request.body || {};
    let imageUrl = body.image || '';
    if (imageUrl && imageUrl.startsWith('data:image')) {
      imageUrl = await saveBase64Image(imageUrl, (body.name || 'product').replace(/[^a-z0-9]+/gi, '-').toLowerCase());
    }
    const id = body.id || newEntityId('P');
    const slug = body.slug || `${(body.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}-${id.slice(-4)}`;
    const product = await repository.createProduct({ ...body, id, slug, image: imageUrl });
    return response.status(201).json({ product });
  } catch (error) { return next(error); }
});

app.patch('/api/admin/products/:id', requireAdminJWT, async (request, response, next) => {
  try {
    const body = request.body || {};
    let updates = { ...body };
    if (updates.image && updates.image.startsWith('data:image')) {
      updates.image = await saveBase64Image(updates.image, (updates.name || request.params.id).replace(/[^a-z0-9]+/gi, '-').toLowerCase());
    }
    const updated = await repository.updateProduct(request.params.id, updates, request.admin?.email || 'admin');
    if (!updated) return response.status(404).json({ error: 'PRODUCT_NOT_FOUND' });
    return response.json({ product: updated });
  } catch (error) { return next(error); }
});

app.delete('/api/admin/products/:id', requireAdminJWT, async (request, response, next) => {
  try {
    const ok = await repository.deleteProduct(request.params.id, request.admin?.email || 'admin');
    if (!ok) return response.status(404).json({ error: 'PRODUCT_NOT_FOUND' });
    return response.json({ ok: true });
  } catch (error) { return next(error); }
});

// ── Admin Category CRUD ────────────────────────────────────────────────
app.get('/api/admin/categories', requireAdminJWT, async (request, response, next) => {
  try {
    const categories = await repository.listCategories();
    return response.json({ categories });
  } catch (error) { return next(error); }
});

app.post('/api/admin/categories', requireAdminJWT, async (request, response, next) => {
  try {
    const body = request.body || {};
    let imageUrl = body.image || '';
    if (imageUrl && imageUrl.startsWith('data:image')) {
      imageUrl = await saveBase64Image(imageUrl, (body.name || 'category').replace(/[^a-z0-9]+/gi, '-').toLowerCase());
    }
    const id = body.id || newEntityId('CAT');
    const category = await repository.createCategory({ ...body, id, image: imageUrl });
    return response.status(201).json({ category });
  } catch (error) { return next(error); }
});

app.patch('/api/admin/categories/:id', requireAdminJWT, async (request, response, next) => {
  try {
    const body = request.body || {};
    let updates = { ...body };
    if (updates.image && updates.image.startsWith('data:image')) {
      updates.image = await saveBase64Image(updates.image, (updates.name || request.params.id).replace(/[^a-z0-9]+/gi, '-').toLowerCase());
    }
    const updated = await repository.updateCategory(request.params.id, updates);
    if (!updated) return response.status(404).json({ error: 'CATEGORY_NOT_FOUND' });
    return response.json({ category: updated });
  } catch (error) { return next(error); }
});

app.delete('/api/admin/categories/:id', requireAdminJWT, async (request, response, next) => {
  try {
    const ok = await repository.deleteCategory(request.params.id);
    if (!ok) return response.status(404).json({ error: 'CATEGORY_NOT_FOUND' });
    return response.json({ ok: true });
  } catch (error) { return next(error); }
});

// ── Admin Image Upload (multipart-free; accepts base64 or URL) ────────
app.post('/api/admin/upload', requireAdminJWT, async (request, response, next) => {
  try {
    const { data, filename } = request.body || {};
    if (!data) return response.status(400).json({ error: 'MISSING_DATA', message: 'Image data required.' });
    const url = await saveBase64Image(data, (filename || 'upload').replace(/[^a-z0-9]+/gi, '-').toLowerCase());
    return response.status(201).json({ url });
  } catch (error) { return next(error); }
});

// ── Logs ───────────────────────────────────────────────────────────────
app.get('/api/admin/audit-logs', requireAdminJWT, async (request, response, next) => {
  try {
    const limit = Math.min(Number(request.query.limit || 50), 200);
    return response.json({ logs: await repository.listAuditLogs(limit) });
  } catch (error) { return next(error); }
});

app.get('/api/admin/notification-logs', requireAdminJWT, async (request, response, next) => {
  try {
    const limit = Math.min(Number(request.query.limit || 50), 200);
    return response.json({ logs: await repository.listNotificationLogs(limit) });
  } catch (error) { return next(error); }
});

// ═══════════════════════════════════════════════════════════════════════
// CATCH-ALL & ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════

app.use('/api', (_request, response) => response.status(404).json({ error: 'API_NOT_FOUND', message: 'That API route does not exist.' }));

const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.get(/^(?!\/api(?:\/|$)).*/, (_request, response) => response.sendFile(path.join(distPath, 'index.html')));

app.use((error, _request, response, _next) => {
  if (error instanceof ZodError) return response.status(400).json({ error: 'VALIDATION_ERROR', issues: error.issues });
  if (error.message?.includes('Product ') && error.message.endsWith(' is unavailable')) return response.status(422).json({ error: 'PRODUCT_UNAVAILABLE', message: error.message });
  console.error('[api-error]', error);
  return response.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong on the studio server.' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`[especially-for-u-api] listening on 0.0.0.0:${port}`);
    console.log(`  repository  = ${repository.mode}`);
    console.log(`  payments    = ${paymentConfig().configured ? 'Razorpay ' + (paymentConfig().testMode ? '(test)' : '(live)') : 'mock mode'}`);
    console.log(`  email       = ${notificationConfig().provider} (${notificationConfig().enabled ? 'enabled' : 'disabled'})`);
    console.log(`  admins      = ${authConfig().adminCount} configured`);
  });
}

export default app;
