import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { createRepository, newEntityId } from './repository.js';
import { calculateOrder, customRequestSchema, orderInputSchema } from './pricing.js';
import { notificationConfig, notifyNewOrder, notifyNewCustomRequest, sendOrderConfirmation } from './notifications.js';
import {
  authenticateAdmin, requireAdminJWT, requireOwnerJWT, authConfig,
  sendRegistrationCode, verifyRegistrationCode, createTeamAdmin, authenticateUser,
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
app.use(express.json({ limit: '65mb' }));

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.resolve(__dirname, '../public/uploads'));
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});

function cloudinaryConfig() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  return CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
    ? { cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY, apiSecret: CLOUDINARY_API_SECRET }
    : null;
}

function cloudinarySignature(params, apiSecret) {
  const serialized = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
  return createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex');
}

async function uploadToCloudinary(dataUrl, filenameHint, folder, resourceType = 'auto') {
  const config = cloudinaryConfig();
  if (!config) return null;
  const match = /^data:(image\/[a-z0-9+.-]+|video\/[a-z0-9+.-]+);base64,(.*)$/is.exec(String(dataUrl || ''));
  if (!match) throw Object.assign(new Error('Upload a valid image or video file.'), { status: 400 });
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${(filenameHint || 'upload').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'upload'}-${randomUUID()}`;
  const signed = { folder, public_id: publicId, timestamp };
  const form = new FormData();
  form.set('file', new Blob([Buffer.from(match[2], 'base64')], { type: match[1] }));
  form.set('api_key', config.apiKey);
  form.set('timestamp', String(timestamp));
  form.set('folder', folder);
  form.set('public_id', publicId);
  form.set('signature', cloudinarySignature(signed, config.apiSecret));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${resourceType}/upload`, { method: 'POST', body: form });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.secure_url) {
    console.error('[cloudinary-upload-error]', result.error?.message || response.statusText);
    throw Object.assign(new Error('Cloudinary could not store this upload. Check the Cloudinary settings and try again.'), { status: 502 });
  }
  return result.secure_url;
}

async function saveBase64Image(b64, filenameHint = 'upload') {
  if (!b64) return null;
  const cloudUrl = await uploadToCloudinary(b64, filenameHint, 'especially-for-u/products', 'image');
  if (cloudUrl) return cloudUrl;
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

async function saveReferenceMedia(dataUrl, filenameHint = 'reference') {
  const match = /^data:(image\/[a-z0-9+.-]+|video\/[a-z0-9+.-]+);base64,(.*)$/is.exec(String(dataUrl || ''));
  if (!match) throw Object.assign(new Error('Upload an image or video file.'), { status: 400 });
  const mime = match[1].toLowerCase();
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 8 * 1024 * 1024) throw Object.assign(new Error('Each reference file must be 8 MB or smaller.'), { status: 413 });
  const cloudUrl = await uploadToCloudinary(dataUrl, filenameHint, 'especially-for-u/references', 'auto');
  if (cloudUrl) return cloudUrl;
  const ext = (mime.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '');
  const folder = path.join(UPLOAD_DIR, 'references');
  await fs.mkdir(folder, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(folder, filename), bytes);
  return `/uploads/references/${filename}`;
}

async function removeReferenceMedia(urls = []) {
  await Promise.all(urls.map(async (url) => {
    const config = cloudinaryConfig();
    if (config && /^https:\/\/res\.cloudinary\.com\//.test(String(url))) {
      const match = /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(?:[^/]+\/)*(?:v\d+\/)?(.+?)\.[a-z0-9]+(?:\?.*)?$/i.exec(String(url));
      if (!match) return;
      const [, resourceType, publicId] = match;
      const timestamp = Math.floor(Date.now() / 1000);
      const signed = { public_id: publicId, timestamp };
      const form = new FormData();
      form.set('public_id', publicId);
      form.set('timestamp', String(timestamp));
      form.set('api_key', config.apiKey);
      form.set('signature', cloudinarySignature(signed, config.apiSecret));
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${resourceType}/destroy`, { method: 'POST', body: form });
      if (!response.ok) console.error('[cloudinary-delete-error]', response.statusText);
      return;
    }
    const prefix = '/uploads/references/';
    if (!String(url).startsWith(prefix)) return;
    const filename = path.basename(String(url).slice(prefix.length));
    await fs.rm(path.join(UPLOAD_DIR, 'references', filename), { force: true }).catch(() => {});
  }));
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
    const { upiId, upiQrImage, paymentInstructions, giftWrapPrice, pricesIncludeTax, ...storefrontSettings } = settings;
    return response.json({
      settings: storefrontSettings,
    });
  } catch (error) { return next(error); }
});

app.get('/api/delivery/areas', async (_request, response, next) => {
  try {
    const areas = await repository.listDeliveryAreas();
    return response.json({ areas: areas.map(({ fee, ...area }) => area), slots: await repository.listDeliverySlots() });
  }
  catch (error) { return next(error); }
});

// Reviews are customer-submitted and only become public after Studio approval.
app.get('/api/reviews', async (request, response, next) => {
  try {
    const productId = String(request.query.productId || '').trim().slice(0, 80) || undefined;
    const reviews = await repository.listReviews({ productId, status: 'APPROVED' });
    return response.json({ reviews });
  } catch (error) { return next(error); }
});

app.post('/api/reviews', requireUserJWT, async (request, response, next) => {
  let uploadedImageUrl = '';
  try {
    const productId = String(request.body?.productId || '').trim().slice(0, 80);
    const rating = Number(request.body?.rating);
    const comment = String(request.body?.comment || '').trim();
    if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 3 || comment.length > 1200) {
      return response.status(400).json({ error: 'INVALID_REVIEW', message: 'Choose 1–5 stars and write a comment between 3 and 1,200 characters.' });
    }
    const imageData = request.body?.imageData || '';
    if (typeof imageData !== 'string' || imageData.length > 7_100_000) {
      return response.status(400).json({ error: 'INVALID_REVIEW_IMAGE', message: 'Choose one review image up to 5 MB.' });
    }
    let imageBytes = null;
    if (imageData) {
      const imageMatch = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(imageData);
      if (!imageMatch) return response.status(400).json({ error: 'INVALID_REVIEW_IMAGE', message: 'Use a JPG, PNG, WebP, or GIF image.' });
      imageBytes = Buffer.from(imageMatch[2], 'base64');
      if (!imageBytes.length || imageBytes.length > 5 * 1024 * 1024) {
        return response.status(400).json({ error: 'INVALID_REVIEW_IMAGE', message: 'Choose one review image up to 5 MB.' });
      }
    }
    const product = await repository.getProduct(productId);
    if (!product || product.isActive === false || product.is_active === 0) return response.status(404).json({ error: 'PRODUCT_NOT_FOUND', message: 'This product is no longer available for review.' });
    if (imageData) uploadedImageUrl = await saveReferenceMedia(imageData, `review-${productId}`);
    const review = await repository.createReview({
      id: newEntityId('REV'), productId, userId: request.user.sub,
      customerName: String(request.user.name || request.user.email?.split('@')[0] || 'Customer').trim().slice(0, 120), rating, comment,
      imageUrl: uploadedImageUrl || null,
    });
    return response.status(201).json({ review, message: 'Thanks! Your review is waiting for studio approval.' });
  } catch (error) {
    if (uploadedImageUrl) await removeReferenceMedia([uploadedImageUrl]).catch(() => {});
    if (error.code === 'ER_DUP_ENTRY') return response.status(409).json({ error: 'REVIEW_EXISTS', message: 'You have already reviewed this product.' });
    if (error.status) return response.status(error.status).json({ error: 'REVIEW_IMAGE_ERROR', message: error.message || 'Could not upload the review image.' });
    return next(error);
  }
});

// ── Order creation (protected) ────────────────────────────────────────
app.post('/api/orders', requireUserJWT, async (request, response, next) => {
  try {
    const input = orderInputSchema.parse(request.body);
    const pricing = calculateOrder(input, await repository.listProducts({}), await repository.getPublicSettings());
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

    const paymentOrder = { status: 'manual', message: 'UPI advance is confirmed manually by the studio.' };

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

app.post('/api/orders/:id/payment-report', requireUserJWT, async (request, response, next) => {
  try {
    const amount = Number(request.body?.amount);
    if (!Number.isSafeInteger(amount) || amount < 1) return response.status(400).json({ error: 'INVALID_AMOUNT', message: 'Enter the amount you sent.' });
    const updated = await repository.reportPayment(request.params.id, request.user.sub, amount, String(request.body?.reference || '').trim().slice(0, 120));
    if (!updated) return response.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'Order was not found for this account.' });
    if (updated.error) return response.status(400).json({ error: updated.error, message: 'The reported amount is more than the remaining balance.' });
    return response.json({ order: updated, message: 'Payment reported. The studio will verify receipt before updating your balance.' });
  } catch (error) { return next(error); }
});

app.delete('/api/orders/:id', requireUserJWT, async (request, response, next) => {
  try {
    const result = await repository.cancelOrder(request.params.id, request.user.sub);
    if (result.error === 'ORDER_NOT_FOUND') return response.status(404).json({ error: result.error, message: 'Order was not found for this account.' });
    if (result.error === 'FORBIDDEN') return response.status(403).json({ error: result.error, message: 'This order does not belong to your account.' });
    if (result.error === 'CANCELLATION_CLOSED') return response.status(409).json({ error: result.error, message: 'The studio has closed cancellation for this order. Please message the studio for help.' });
    return response.json({ cancelled: true, message: 'Order and its related data have been permanently deleted.' });
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

function isOrderChatClosedForCustomer(order) {
  return String(order?.status || '').toUpperCase() === 'DELIVERED'
    && String(order?.paymentStatus || order?.payment_status || '').toUpperCase() === 'PAID';
}

// ── Order Queries (user side) ──────────────────────────────────────────
app.post('/api/orders/:id/queries', requireUserJWT, async (request, response, next) => {
  try {
    const order = await repository.getOrder(request.params.id);
    if (!order) return response.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'We could not find that order.' });
    if ((order.userId || order.user_id) && (order.userId || order.user_id) !== request.user.sub) {
      return response.status(403).json({ error: 'FORBIDDEN', message: 'This order does not belong to you.' });
    }
    if (isOrderChatClosedForCustomer(order)) {
      return response.status(409).json({ error: 'CHAT_CLOSED', message: 'This order is fully paid and delivered. Its conversation is closed.' });
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

app.route('/api/conversations/:type/:id')
  .get(requireUserJWT, async (request, response, next) => {
    try {
      const { type, id } = request.params;
      const entity = type === 'order' ? await repository.getOrder(id) : type === 'request' ? await repository.getCustomRequest(id) : null;
      if (!entity) return response.status(404).json({ error: 'CONVERSATION_NOT_FOUND' });
      if ((entity.userId || entity.user_id) !== request.user.sub) return response.status(403).json({ error: 'FORBIDDEN' });
      return response.json({ messages: await repository.listConversationMessages(type.toUpperCase(), id) });
    } catch (error) { return next(error); }
  })
  .post(requireUserJWT, async (request, response, next) => {
    try {
      const { type, id } = request.params;
      const entity = type === 'order' ? await repository.getOrder(id) : type === 'request' ? await repository.getCustomRequest(id) : null;
      if (!entity) return response.status(404).json({ error: 'CONVERSATION_NOT_FOUND' });
      if ((entity.userId || entity.user_id) !== request.user.sub) return response.status(403).json({ error: 'FORBIDDEN' });
      if (type === 'order' && isOrderChatClosedForCustomer(entity)) {
        return response.status(409).json({ error: 'CHAT_CLOSED', message: 'This order is fully paid and delivered. Its conversation is closed.' });
      }
      const message = String(request.body?.message || '').trim();
      if (!message || message.length > 3000) return response.status(400).json({ error: 'INVALID_MESSAGE', message: 'Write a message up to 3,000 characters.' });
      const saved = await repository.addConversationMessage({ type: type.toUpperCase(), entityId: id, userId: request.user.sub, senderRole: 'CUSTOMER', message });
      return response.status(201).json({ message: saved });
    } catch (error) { return next(error); }
  });

app.get('/api/custom-requests/mine', requireUserJWT, async (request, response, next) => {
  try { return response.json({ requests: await repository.listCustomRequestsByUser(request.user.sub) }); }
  catch (error) { return next(error); }
});

app.get('/api/custom-requests/:id', requireUserJWT, async (request, response, next) => {
  try {
    const item = await repository.getCustomRequest(request.params.id);
    if (!item) return response.status(404).json({ error: 'REQUEST_NOT_FOUND' });
    if (item.userId !== request.user.sub) return response.status(403).json({ error: 'FORBIDDEN' });
    return response.json({ request: item });
  } catch (error) { return next(error); }
});

app.post('/api/custom-requests/:id/accept-quote', requireUserJWT, async (request, response, next) => {
  try {
    const custom = await repository.getCustomRequest(request.params.id);
    if (!custom) return response.status(404).json({ error: 'REQUEST_NOT_FOUND' });
    if (custom.userId !== request.user.sub) return response.status(403).json({ error: 'FORBIDDEN' });
    const quote = custom.quote || {};
    if (custom.status === 'QUOTE_ACCEPTED' && quote.orderId) {
      const existingOrder = await repository.getOrder(quote.orderId);
      if (existingOrder) return response.json({ order: existingOrder, reused: true });
    }
    const total = Number(quote.amount);
    if (custom.status !== 'QUOTE_SENT' || !Number.isSafeInteger(total) || total < 1) {
      return response.status(409).json({ error: 'QUOTE_UNAVAILABLE', message: 'There is no active quote to accept yet.' });
    }
    const id = newEntityId('EFU');
    const advanceDue = Math.ceil(total / 2);
    const order = {
      id, userId: request.user.sub, status: 'PENDING_PAYMENT',
      customer: { name: custom.customer.name, email: custom.customer.email, phone: custom.customer.phone, note: `Custom request ${custom.id}` },
      delivery: { area: 'Muradnagar · pickup location to confirm', method: 'campus', handoverSpot: custom.pickupLocation || 'Confirm with customer', slotId: '', locationText: custom.pickupLocation || 'Confirm in chat', pickupDate: custom.neededBy || '' },
      gift: {},
      pricing: { lineItems: [{ productId: custom.productId || custom.id, productName: custom.title, quantity: 1, unitPrice: total, selected: [], customization: { description: custom.description, referenceUrls: custom.referenceUrls || [] }, lineTotal: total }], subtotal: total, deliveryFee: 0, giftWrapFee: 0, total, advanceDue, balanceDue: total - advanceDue, paymentPlan: 'ADVANCE_50', locationApproval: 'NOT_NEEDED', paymentOptions: ['ADVANCE_50'], hasCustomItem: true },
    };
    await repository.createOrder(order);
    await repository.updateCustomRequestStatus(custom.id, 'QUOTE_ACCEPTED', { ...quote, orderId: id }, 'customer');
    await repository.addConversationMessage({ type: 'REQUEST', entityId: custom.id, userId: request.user.sub, senderRole: 'CUSTOMER', message: `I accept the quote. Please proceed with order ${id}.` });
    await repository.addConversationMessage({ type: 'ORDER', entityId: id, userId: request.user.sub, senderRole: 'ADMIN', message: `Your custom order is ready to begin after we verify ₹${advanceDue.toLocaleString('en-IN')} advance. Use the payment details on your order tracker.` });
    return response.status(201).json({ order });
  } catch (error) { return next(error); }
});

// ── Custom requests (protected) ───────────────────────────────────────
app.post('/api/custom-requests', requireUserJWT, async (request, response, next) => {
  try {
    const input = customRequestSchema.parse(request.body);
    const product = input.productId ? await repository.getProduct(input.productId) : null;
    const uploadedUrls = [];
    const { referenceFiles, ...requestInput } = input;
    let saved;
    try {
      for (const file of referenceFiles) uploadedUrls.push(await saveReferenceMedia(file.data, file.name));
      const requestRecord = { ...requestInput, referenceUrls: [...input.referenceUrls, ...uploadedUrls], userId: request.user.sub, id: newEntityId('CR'), productName: product?.name || '', status: 'NEW' };
      saved = await repository.createCustomRequest(requestRecord);
    } catch (error) {
      await removeReferenceMedia(uploadedUrls);
      throw error;
    }
    try {
      await repository.addConversationMessage({ type: 'REQUEST', entityId: saved.id, userId: request.user.sub, senderRole: 'CUSTOMER', message: saved.description });
    } catch (error) {
      console.error('[custom-request-chat-error]', error.message);
    }

    try {
      await notifyNewCustomRequest(saved);
      await repository.logNotification({
        eventType: 'new_custom_request', recipient: process.env.ORDER_NOTIFICATION_EMAIL || '',
        channel: 'email', status: 'sent',
      });
    } catch { /* silent */ }

    return response.status(201).json({ request: saved, message: 'Request received. We will review the idea and send a manual quote.' });
  } catch (error) {
    if (error instanceof ZodError) return next(error);
    if (Number(error.status) >= 400) return response.status(error.status).json({ error: 'CUSTOM_REQUEST_ERROR', message: error.message });
    return next(error);
  }
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
    const result = await sendRegistrationCode(repository, { email, password, name, phone });
    return response.status(200).json(result);
  } catch (error) {
    if (error.code === 'EMAIL_TAKEN') return response.status(409).json({ error: 'EMAIL_TAKEN', message: error.message });
    if (error.code === 'OTP_COOLDOWN') return response.status(429).json({ error: error.code, message: error.message });
    if (error.code === 'EMAIL_NOT_CONFIGURED' || error.code === 'EMAIL_SEND_FAILED') return response.status(503).json({ error: error.code, message: error.message });
    if (['INVALID_EMAIL', 'INVALID_REGISTRATION'].includes(error.code)) return response.status(400).json({ error: error.code, message: error.message });
    return next(error);
  }
});

app.post('/api/auth/verify-email', async (request, response, next) => {
  try {
    const { email, code } = request.body || {};
    const result = await verifyRegistrationCode(repository, email, code);
    return response.status(201).json(result);
  } catch (error) {
    if (error.code === 'EMAIL_TAKEN') return response.status(409).json({ error: error.code, message: error.message });
    if (['OTP_EXPIRED', 'OTP_ATTEMPTS_EXCEEDED', 'INVALID_OTP'].includes(error.code)) return response.status(400).json({ error: error.code, message: error.message });
    return next(error);
  }
});

app.post('/api/auth/resend-verification', async (request, response, next) => {
  try {
    const result = await sendRegistrationCode(repository, { email: request.body?.email }, { resend: true });
    return response.json(result);
  } catch (error) {
    if (error.code === 'OTP_COOLDOWN') return response.status(429).json({ error: error.code, message: error.message });
    if (error.code === 'VERIFICATION_NOT_FOUND' || error.code === 'OTP_ATTEMPTS_EXCEEDED') return response.status(400).json({ error: error.code, message: error.message });
    if (error.code === 'EMAIL_NOT_CONFIGURED' || error.code === 'EMAIL_SEND_FAILED') return response.status(503).json({ error: error.code, message: error.message });
    return next(error);
  }
});

app.post('/api/auth/admin-register', async (request, response, next) => {
  return response.status(410).json({ error: 'ADMIN_SIGNUP_DISABLED', message: 'Admin accounts must be added by an owner from the Studio Desk.' });
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

app.post('/api/auth/forgot-password', async (request, response, next) => {
  try {
    const { email } = request.body || {};
    if (!email) return response.status(400).json({ error: 'MISSING_EMAIL', message: 'Email is required.' });
    const result = await generatePasswordResetToken(repository, email);
    return response.json(result);
  } catch (error) {
    if (['EMAIL_NOT_CONFIGURED', 'EMAIL_SEND_FAILED', 'APP_BASE_URL_NOT_CONFIGURED'].includes(error.code)) {
      console.error(`[password-reset] ${error.code}: ${error.message}`);
      return response.status(503).json({ error: error.code, message: 'Password reset is temporarily unavailable. Please try again later.' });
    }
    return next(error);
  }
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

    const result = await authenticateAdmin(repository, email, password);
    if (!result) {
      return response.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }

    return response.json({ token: result.token, admin: result.admin });
  } catch (error) { return next(error); }
});

app.get('/api/admin/team', requireOwnerJWT, async (_request, response, next) => {
  try { return response.json({ admins: await repository.listAdminUsers() }); }
  catch (error) { return next(error); }
});

app.post('/api/admin/team', requireOwnerJWT, async (request, response, next) => {
  try {
    const admin = await createTeamAdmin(repository, request.body || {});
    return response.status(201).json({ admin });
  } catch (error) {
    if (error.code === 'EMAIL_TAKEN') return response.status(409).json({ error: error.code, message: error.message });
    if (error.code === 'INVALID_ADMIN') return response.status(400).json({ error: error.code, message: error.message });
    return next(error);
  }
});

app.patch('/api/admin/team/:id', requireOwnerJWT, async (request, response, next) => {
  try {
    if (!['true', 'false'].includes(String(request.body?.isActive))) return response.status(400).json({ error: 'INVALID_STATUS' });
    const admin = await repository.updateUser(request.params.id, { isActive: request.body.isActive === 'true' });
    if (!admin) return response.status(404).json({ error: 'ADMIN_NOT_FOUND' });
    return response.json({ admin });
  } catch (error) { return next(error); }
});

app.post('/api/admin/orders/:id/payments', requireAdminJWT, async (request, response, next) => {
  try {
    const amount = Number(request.body?.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) return response.status(400).json({ error: 'INVALID_AMOUNT', message: 'Enter a payment amount greater than zero.' });
    const method = ['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER'].includes(request.body?.method) ? request.body.method : 'UPI';
    const updated = await repository.recordManualPayment(request.params.id, { amount, method, reference: String(request.body?.reference || '').trim().slice(0, 120), note: String(request.body?.note || '').trim().slice(0, 500) }, request.admin?.email || 'admin');
    if (!updated) return response.status(404).json({ error: 'ORDER_NOT_FOUND' });
    if (updated.error === 'OVERPAYMENT') return response.status(400).json({ error: 'OVERPAYMENT', message: 'This amount is more than the remaining balance.' });
    return response.json({ order: updated });
  } catch (error) { return next(error); }
});

app.get('/api/admin/conversations', requireAdminJWT, async (_request, response, next) => {
  try { return response.json({ conversations: await repository.listConversations() }); }
  catch (error) { return next(error); }
});

app.get('/api/admin/conversations/:type/:id', requireAdminJWT, async (request, response, next) => {
  try { return response.json({ messages: await repository.listConversationMessages(request.params.type.toUpperCase(), request.params.id) }); }
  catch (error) { return next(error); }
});

app.post('/api/admin/conversations/:type/:id', requireAdminJWT, async (request, response, next) => {
  try {
    const { type, id } = request.params;
    const entity = type === 'order' ? await repository.getOrder(id) : type === 'request' ? await repository.getCustomRequest(id) : null;
    if (!entity) return response.status(404).json({ error: 'CONVERSATION_NOT_FOUND' });
    const message = String(request.body?.message || '').trim();
    if (!message || message.length > 3000) return response.status(400).json({ error: 'INVALID_MESSAGE', message: 'Write a message up to 3,000 characters.' });
    const saved = await repository.addConversationMessage({ type: type.toUpperCase(), entityId: id, userId: entity.userId || entity.user_id, senderRole: 'ADMIN', message });
    return response.status(201).json({ message: saved });
  } catch (error) { return next(error); }
});

app.delete('/api/admin/conversations/:type/:id', requireAdminJWT, async (request, response, next) => {
  try {
    const { type, id } = request.params;
    const entity = type === 'order' ? await repository.getOrder(id) : type === 'request' ? await repository.getCustomRequest(id) : null;
    if (!entity) return response.status(404).json({ error: 'CONVERSATION_NOT_FOUND' });
    const completed = type === 'order' ? ['DELIVERED', 'COMPLETED'].includes(entity.status) : entity.status === 'COMPLETED';
    if (!completed) return response.status(409).json({ error: 'ORDER_NOT_COMPLETE', message: 'Chat and reference files can be cleared after the order or request is complete.' });
    await repository.deleteConversation(type.toUpperCase(), id);
    if (type === 'request') await removeReferenceMedia(await repository.clearCustomRequestMedia(id) || []);
    return response.json({ ok: true });
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

app.patch('/api/admin/orders/:id/cancellation', requireAdminJWT, async (request, response, next) => {
  try {
    if (typeof request.body?.allowed !== 'boolean') {
      return response.status(400).json({ error: 'INVALID_CANCELLATION_SETTING', message: 'allowed must be true or false.' });
    }
    const order = await repository.setOrderCancellationAllowed(request.params.id, request.body.allowed);
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
    const list = (await repository.listAdminProducts({ category, q })).slice(0, limit);
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

app.get('/api/admin/reviews', requireAdminJWT, async (_request, response, next) => {
  try { return response.json({ reviews: await repository.listReviews() }); }
  catch (error) { return next(error); }
});

app.patch('/api/admin/reviews/:id', requireAdminJWT, async (request, response, next) => {
  try {
    const status = String(request.body?.status || '').toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(status)) return response.status(400).json({ error: 'INVALID_REVIEW_STATUS' });
    const review = await repository.updateReviewStatus(request.params.id, status);
    if (!review) return response.status(404).json({ error: 'REVIEW_NOT_FOUND' });
    return response.json({ review });
  } catch (error) { return next(error); }
});

app.delete('/api/admin/reviews/:id', requireAdminJWT, async (request, response, next) => {
  try {
    const review = (await repository.listReviews()).find((item) => item.id === request.params.id);
    const ok = await repository.deleteReview(request.params.id);
    if (!ok) return response.status(404).json({ error: 'REVIEW_NOT_FOUND' });
    if (review?.imageUrl) await removeReferenceMedia([review.imageUrl]).catch(() => {});
    return response.json({ ok: true });
  } catch (error) { return next(error); }
});

// ── Admin Image Upload (multipart-free; accepts base64 or URL) ────────
app.post('/api/admin/upload', requireAdminJWT, async (request, response, next) => {
  try {
    const { data: requestedData, image, filename } = request.body || {};
    const data = requestedData || image;
    if (!data) return response.status(400).json({ error: 'MISSING_DATA', message: 'Image data required.' });
    const match = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(String(data));
    if (!match) return response.status(400).json({ error: 'INVALID_IMAGE', message: 'Use a JPG, PNG, WebP, or GIF image.' });
    if (Buffer.from(match[2], 'base64').length > 4 * 1024 * 1024) {
      return response.status(413).json({ error: 'IMAGE_TOO_LARGE', message: 'Image too large — max 4MB.' });
    }
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
app.use('/uploads', express.static(UPLOAD_DIR, { fallthrough: false, maxAge: 0 }));
app.use(express.static(distPath));
app.get(/^(?!\/api(?:\/|$)).*/, (_request, response) => response.sendFile(path.join(distPath, 'index.html')));

app.use((error, _request, response, _next) => {
  if (error instanceof ZodError) return response.status(400).json({ error: 'VALIDATION_ERROR', issues: error.issues });
  if (error.type === 'entity.too.large') return response.status(413).json({ error: 'IMAGE_TOO_LARGE', message: 'Upload is too large. Choose an image up to 4MB.' });
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
