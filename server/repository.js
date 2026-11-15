import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { catalogDeliveryAreas, catalogDeliverySlots, catalogStoreSettings, publicProduct } from './catalog.js';
import { getPool, getDatabaseMode } from './db.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

const memory = {
  orders: [],
  orderQueries: [],
  requests: [],
  auditLogs: [],
  notificationLogs: [],
  users: [],
  resetTokens: [],
  emailVerifications: {},
  products: [],
  reviews: [],
  // The in-memory fallback mirrors the database. Keep it empty after a wipe;
  // catalog fixtures must not appear as deletable records that do not exist.
  categories: [],
};

function memoryRepository() {
  return {
    mode: 'memory-fallback',
    async listProducts({ category, occasion, q } = {}) {
      return memory.products.filter((product) => (!category || category === 'all' || product.category === category) && (!occasion || occasion === 'all' || (product.occasions || []).includes(occasion)) && (!q || `${product.name} ${product.description}`.toLowerCase().includes(q.toLowerCase()))).map(publicProduct);
    },
    async listAdminProducts({ category, q } = {}) {
      return clone(memory.products.filter((product) => (!category || category === 'all' || product.category === category) && (!q || `${product.name} ${product.description}`.toLowerCase().includes(q.toLowerCase()))));
    },
    async getProduct(id) {
      const product = memory.products.find((p) => p.id === id);
      return product ? clone(product) : null;
    },
    async listReviews({ productId, status } = {}) {
      return clone(memory.reviews
        .filter((review) => (!productId || review.productId === productId) && (!status || review.status === status))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((review) => ({ ...review, productName: memory.products.find((product) => product.id === review.productId)?.name || '' })));
    },
    async createReview(review) {
      if (memory.reviews.some((item) => item.productId === review.productId && item.userId === review.userId)) {
        const error = new Error('You have already reviewed this product.'); error.code = 'ER_DUP_ENTRY'; throw error;
      }
      const saved = { ...clone(review), id: review.id || newEntityId('REV'), status: 'PENDING', createdAt: new Date().toISOString() };
      memory.reviews.unshift(saved);
      return clone(saved);
    },
    async updateReviewStatus(id, status) {
      const review = memory.reviews.find((item) => item.id === id);
      if (!review) return null;
      review.status = status;
      return clone(review);
    },
    async deleteReview(id) {
      const index = memory.reviews.findIndex((item) => item.id === id);
      if (index < 0) return false;
      memory.reviews.splice(index, 1);
      return true;
    },
    async createProduct(product) {
      const saved = { ...clone(product), id: product.id || newEntityId('P'), createdAt: new Date().toISOString() };
      memory.products.unshift(saved);
      return clone(saved);
    },
    async updateProduct(id, updates) {
      const product = memory.products.find((p) => p.id === id);
      if (!product) return null;
      Object.assign(product, updates);
      memory.auditLogs.unshift({ actor: 'admin', action: 'UPDATE_PRODUCT', entity: 'product', entityId: id, diff: updates, createdAt: new Date().toISOString() });
      return clone(product);
    },
    async deleteProduct(id) {
      const idx = memory.products.findIndex((p) => p.id === id);
      if (idx < 0) return false;
      memory.products.splice(idx, 1);
      memory.auditLogs.unshift({ actor: 'admin', action: 'DELETE_PRODUCT', entity: 'product', entityId: id, diff: {}, createdAt: new Date().toISOString() });
      return true;
    },
    async listCategories() { return clone(memory.categories); },
    async getCategory(id) {
      const c = memory.categories.find((c) => c.id === id);
      return c ? clone(c) : null;
    },
    async createCategory(category) {
      const saved = { ...clone(category), id: category.id || newEntityId('CAT') };
      memory.categories.push(saved);
      return clone(saved);
    },
    async updateCategory(id, updates) {
      const c = memory.categories.find((c) => c.id === id);
      if (!c) return null;
      Object.assign(c, updates);
      return clone(c);
    },
    async deleteCategory(id) {
      const idx = memory.categories.findIndex((c) => c.id === id);
      if (idx < 0) return false;
      memory.categories.splice(idx, 1);
      return true;
    },
    async getPublicSettings() { return { ...clone(catalogStoreSettings), upiId: catalogStoreSettings.upiId || process.env.UPI_ID || '', upiQrImage: catalogStoreSettings.upiQrImage || process.env.UPI_QR_IMAGE_URL || '', paymentInstructions: catalogStoreSettings.paymentInstructions || 'Pay the requested amount by UPI. We will start after confirming it.' }; },
    async listDeliveryAreas() { return catalogDeliveryAreas.map((label, index) => ({ id: String(index + 1), label, areaType: index === 0 ? 'CAMPUS' : label.startsWith('Other') ? 'MANUAL' : 'LOCAL', fee: index === 0 ? 0 : 50, approvalRequired: label.startsWith('Other'), isActive: true })); },
    async listDeliverySlots() { return clone(catalogDeliverySlots); },
    async createOrder(order) { const saved = { ...clone(order), id: order.id || `EFU-${1043 + memory.orders.length}`, userId: order.userId || null, total: Number(order.pricing?.total || 0), paidAmount: 0, balanceDue: Number(order.pricing?.total || 0), paymentStatus: 'PENDING', cancellationAllowed: true, estimatedDate: null, pickupDate: order.delivery?.pickupDate || null, createdAt: new Date().toISOString() }; memory.orders.unshift(saved); return saved; },
    async getOrder(id) { return memory.orders.find((order) => order.id === id) || null; },
    async setOrderCancellationAllowed(id, allowed) {
      const order = memory.orders.find((item) => item.id === id);
      if (!order) return null;
      order.cancellationAllowed = allowed;
      return clone(order);
    },
    async cancelOrder(id, userId) {
      const index = memory.orders.findIndex((item) => item.id === id);
      if (index < 0) return { error: 'ORDER_NOT_FOUND' };
      const order = memory.orders[index];
      if (String(order.userId || order.user_id || '') !== String(userId)) return { error: 'FORBIDDEN' };
      if (order.cancellationAllowed === false || order.cancellation_allowed === 0) return { error: 'CANCELLATION_CLOSED' };
      const queryIds = (memory.orderQueries || []).filter((query) => query.orderId === id).map((query) => String(query.id));
      memory.orders.splice(index, 1);
      memory.orderQueries = (memory.orderQueries || []).filter((query) => query.orderId !== id);
      memory.conversationMessages = (memory.conversationMessages || []).filter((message) => !(message.conversationType === 'ORDER' && message.entityId === id));
      memory.auditLogs = (memory.auditLogs || []).filter((entry) => !(
        (entry.entity === 'order' && String(entry.entityId) === id)
        || (entry.entity === 'order_query' && queryIds.includes(String(entry.entityId)))
      ));
      return { ok: true };
    },
    async getOrderWithItems(id) {
      const order = memory.orders.find((o) => o.id === id);
      if (!order) return null;
      return clone({ ...order, items: order.pricing?.lineItems || [] });
    },
    async listOrders() {
      return clone(memory.orders.map((order) => ({
        ...order,
        productNames: (order.pricing?.lineItems || []).map((item) => item.productName).filter(Boolean).join(', '),
      })));
    },
    async updateOrderStatus(id, status, actor) {
      const order = memory.orders.find((o) => o.id === id);
      if (!order) return null;
      const prev = order.status;
      order.status = status;
      memory.auditLogs.unshift({ actor, action: 'UPDATE_STATUS', entity: 'order', entityId: id, diff: { from: prev, to: status }, createdAt: new Date().toISOString() });
      return clone(order);
    },
    async updatePaymentStatus(id, paymentStatus, razorpayPaymentId) {
      const order = memory.orders.find((o) => o.id === id);
      if (!order) return null;
      order.paymentStatus = paymentStatus;
      if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
      if (paymentStatus === 'PAID' && order.status === 'PENDING_PAYMENT') order.status = 'PENDING_CONFIRMATION';
      return clone(order);
    },
    async recordManualPayment(id, payment, actor) {
      const order = memory.orders.find((item) => item.id === id);
      if (!order) return null;
      const total = Number(order.pricing?.total || order.total || 0);
      const paid = Number(order.paidAmount || 0) + Number(payment.amount || 0);
      if (paid > total) return { error: 'OVERPAYMENT' };
      order.paidAmount = paid;
      order.balanceDue = Math.max(0, total - paid);
      order.paymentStatus = paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
      if (order.paymentStatus === 'PAID' && order.status === 'PENDING_PAYMENT') order.status = 'PENDING_CONFIRMATION';
      order.paymentRecords ||= [];
      order.paymentRecords.unshift({ ...clone(payment), createdBy: actor, receivedAt: new Date().toISOString() });
      order.reportedAmount = 0; order.reportedReference = '';
      return clone(order);
    },
    async reportPayment(id, userId, amount, reference) {
      const order = memory.orders.find((item) => item.id === id);
      if (!order || order.userId !== userId) return null;
      const total = Number(order.pricing?.total || order.total || 0);
      const remaining = Math.max(0, total - Number(order.paidAmount || 0));
      if (amount > remaining) return { error: 'INVALID_AMOUNT' };
      order.paymentStatus = 'AWAITING_VERIFICATION'; order.reportedAmount = amount; order.reportedReference = reference || '';
      return clone(order);
    },
    async updateLocationApproval(id, approval, actor) {
      const order = memory.orders.find((o) => o.id === id);
      if (!order) return null;
      if (order.pricing) order.pricing.locationApproval = approval;
      else order.locationApproval = approval;
      memory.auditLogs.unshift({ actor, action: 'UPDATE_LOCATION_APPROVAL', entity: 'order', entityId: id, diff: { approval }, createdAt: new Date().toISOString() });
      return clone(order);
    },
    async createCustomRequest(request) { const saved = { ...clone(request), id: request.id || `CR-${1043 + memory.requests.length}`, status: 'NEW', createdAt: new Date().toISOString() }; memory.requests.unshift(saved); return saved; },
    async getCustomRequest(id) { return memory.requests.find((r) => r.id === id) || null; },
    async listCustomRequests() { return clone(memory.requests.map((request) => ({ ...request, customer: request.customer?.name || request.customer || '', email: request.customer?.email || request.email || '', phone: request.customer?.phone || request.phone || '', referenceUrls: request.referenceUrls || [] }))); },
    async updateCustomRequestStatus(id, status, quoteJson, actor) {
      const request = memory.requests.find((r) => r.id === id);
      if (!request) return null;
      const prev = request.status;
      request.status = status;
      if (quoteJson) request.quote = quoteJson;
      memory.auditLogs.unshift({ actor, action: 'UPDATE_REQUEST_STATUS', entity: 'custom_request', entityId: id, diff: { from: prev, to: status, quote: quoteJson || null }, createdAt: new Date().toISOString() });
      return clone(request);
    },
    async createUser(user) {
      const saved = { ...clone(user), id: user.id || newEntityId('U'), role: user.role || 'USER', isActive: true, createdAt: new Date().toISOString() };
      memory.users.push(saved);
      return clone(saved);
    },
    async getUserByEmail(email, includeHash = false) {
      const user = memory.users.find((u) => u.email && u.email.toLowerCase() === String(email).toLowerCase());
      if (!user) return null;
      const out = clone(user);
      if (!includeHash) delete out.passwordHash;
      return out;
    },
    async getUserById(id) {
      const user = memory.users.find((u) => u.id === id);
      if (!user) return null;
      const out = clone(user);
      delete out.passwordHash;
      return out;
    },
    async updateUser(id, updates) {
      const user = memory.users.find((u) => u.id === id);
      if (!user) return null;
      Object.assign(user, updates);
      return clone(user);
    },
    async listAdminUsers() { return clone(memory.users.filter((user) => ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'].includes(String(user.role).toUpperCase())).map(({ passwordHash, ...user }) => user)); },
    async getEmailVerification(email) { return memory.emailVerifications[email] ? clone(memory.emailVerifications[email]) : null; },
    async saveEmailVerification(record) { memory.emailVerifications[record.email] = clone(record); return true; },
    async incrementEmailVerificationAttempts(email) { const record = memory.emailVerifications[email]; if (!record) return false; record.attempts = Number(record.attempts || 0) + 1; return true; },
    async deleteEmailVerification(email) { delete memory.emailVerifications[email]; return true; },
    async createPasswordResetToken(userId, tokenHash, expiresAt) {
      memory.resetTokens.unshift({ id: memory.resetTokens.length + 1, userId, tokenHash, expiresAt: expiresAt.toISOString ? expiresAt.toISOString() : expiresAt, usedAt: null, createdAt: new Date().toISOString() });
    },
    async findPasswordResetToken(tokenHash) {
      return memory.resetTokens.find((t) => t.tokenHash === tokenHash) || null;
    },
    async consumePasswordResetToken(tokenHash) {
      const t = memory.resetTokens.find((x) => x.tokenHash === tokenHash && !x.usedAt);
      if (!t) return false;
      t.usedAt = new Date().toISOString();
      return true;
    },
    async updatePassword(userId, newPasswordHash) {
      const user = memory.users.find((u) => u.id === userId);
      if (!user) return null;
      user.passwordHash = newPasswordHash;
      return clone(user);
    },
    async adminSummary() {
      const today = new Date().toISOString().slice(0, 10);
      const todayOrders = memory.orders.filter((o) => (o.createdAt || '').startsWith(today));
      const totalRevenue = memory.orders.reduce((sum, o) => sum + (o.pricing?.total || o.total || 0), 0);
      return {
        ordersToday: todayOrders.length,
        pendingQuotes: memory.requests.filter((r) => r.status === 'NEW' || r.status === 'QUOTE_SENT').length,
        inProduction: memory.orders.filter((o) => o.status === 'IN_PRODUCTION').length,
        totalOrders: memory.orders.length,
        totalRevenue,
        pendingPayments: memory.orders.filter((o) => o.status === 'PENDING_PAYMENT').length,
        databaseMode: getDatabaseMode(),
      };
    },
    async logNotification(entry) {
      memory.notificationLogs.unshift({ ...entry, createdAt: new Date().toISOString() });
    },
    async listAuditLogs(limit = 50) { return clone(memory.auditLogs.slice(0, limit)); },
    async listNotificationLogs(limit = 50) { return clone(memory.notificationLogs.slice(0, limit)); },
    async updateSettings(updates) { Object.assign(catalogStoreSettings, updates); return clone(catalogStoreSettings); },
    async updateOrderEstimatedDate(id, estimatedDate, actor) {
      const order = memory.orders.find((o) => o.id === id);
      if (!order) return null;
      order.estimatedDate = estimatedDate;
      memory.auditLogs.unshift({ actor, action: 'UPDATE_ESTIMATED_DATE', entity: 'order', entityId: id, diff: { estimatedDate }, createdAt: new Date().toISOString() });
      return clone(order);
    },
    async createOrderQuery({ orderId, userId, message }) {
      const saved = { id: memory.orderQueries.length + 1, orderId, userId, message, adminReply: null, status: 'OPEN', createdAt: new Date().toISOString(), repliedAt: null };
      memory.orderQueries.unshift(saved);
      return clone(saved);
    },
    async listOrderQueriesByOrder(orderId) { return clone(memory.orderQueries.filter((q) => q.orderId === orderId)); },
    async listAllOrderQueries() { return clone(memory.orderQueries); },
    async replyToOrderQuery(id, reply, actor) {
      const q = memory.orderQueries.find((x) => x.id === id);
      if (!q) return null;
      q.adminReply = reply; q.status = 'REPLIED'; q.repliedAt = new Date().toISOString();
      memory.auditLogs.unshift({ actor, action: 'REPLY_QUERY', entity: 'order_query', entityId: String(id), diff: { reply }, createdAt: new Date().toISOString() });
      return clone(q);
    },
    async listOrdersByUser(userId) {
      return clone(memory.orders
        .filter((order) => order.userId === userId || order.user_id === userId)
        .map((order) => ({
          ...order,
          productNames: (order.pricing?.lineItems || []).map((item) => item.productName).filter(Boolean).join(', '),
        })));
    },
    async addConversationMessage({ type, entityId, userId, senderRole, message }) {
      memory.conversationMessages ||= [];
      const saved = { id: randomUUID(), conversationType: type, entityId, userId, senderRole, message, createdAt: new Date().toISOString() };
      memory.conversationMessages.push(saved);
      return clone(saved);
    },
    async listConversationMessages(type, entityId) { return clone((memory.conversationMessages || []).filter((m) => m.conversationType === type && m.entityId === entityId)); },
    async listConversations() {
      const messages = memory.conversationMessages || [];
      const groups = new Map();
      for (const message of messages) {
        const key = `${message.conversationType}:${message.entityId}`;
        const entity = message.conversationType === 'ORDER' ? memory.orders.find((item) => item.id === message.entityId) : memory.requests.find((item) => item.id === message.entityId);
        const customer = entity?.customer || {};
        groups.set(key, { conversationType: message.conversationType, entityId: message.entityId, userId: message.userId, customerName: customer.name || entity?.customer_name || '', customerPhone: customer.phone || entity?.customer_phone || '', lastMessage: message.message, updatedAt: message.createdAt });
      }
      return clone([...groups.values()]);
    },
    async deleteConversation(type, entityId) { memory.conversationMessages = (memory.conversationMessages || []).filter((m) => !(m.conversationType === type && m.entityId === entityId)); return true; },
    async listCustomRequestsByUser(userId) { return clone(memory.requests.filter((r) => r.userId === userId)); },
    async clearCustomRequestMedia(id) {
      const request = memory.requests.find((r) => r.id === id);
      if (!request) return null;
      const refs = request.referenceUrls || [];
      request.referenceUrls = [];
      return refs;
    },
  };
}

function mysqlRepository(pool) {
  return {
    mode: 'managed-mysql',
    async listProducts({ category, occasion, q } = {}) {
      const where = ['is_active = 1']; const params = [];
      if (category && category !== 'all') { where.push('category = ?'); params.push(category); }
      if (occasion && occasion !== 'all') { where.push('JSON_CONTAINS(occasions_json, ?)'); params.push(JSON.stringify(occasion)); }
      if (q) { where.push('(name LIKE ? OR description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
      const [rows] = await pool.query(`SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY sort_order, name`, params);
      return rows.map((row) => publicProduct({ ...row, originalPrice: row.original_price, saleStartsAt: row.sale_starts_at, saleEndsAt: row.sale_ends_at, startingFrom: false, occasions: parseJson(row.occasions_json, []), options: parseJson(row.options_json, []), allowCustomRequest: Boolean(row.allow_custom_request), isMadeToOrder: Boolean(row.is_made_to_order), returnable: Boolean(row.returnable), customizable: Boolean(row.customizable), premium: false }));
    },
    async listReviews({ productId, status } = {}) {
      const where = []; const params = [];
      if (productId) { where.push('r.product_id = ?'); params.push(productId); }
      if (status) { where.push('r.status = ?'); params.push(status); }
      const [rows] = await pool.query(`SELECT r.id, r.product_id AS productId, r.user_id AS userId, r.customer_name AS customerName, r.rating, r.comment, r.image_url AS imageUrl, r.status, r.created_at AS createdAt, p.name AS productName, p.slug AS productSlug, p.image AS productImage FROM product_reviews r LEFT JOIN products p ON p.id = r.product_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY r.created_at DESC LIMIT 500`, params);
      return rows;
    },
    async createReview(review) {
      const id = review.id || newEntityId('REV');
      await pool.query('INSERT INTO product_reviews (id,product_id,user_id,customer_name,rating,comment,image_url,status) VALUES (?,?,?,?,?,?,?,?)', [id, review.productId, review.userId, review.customerName, review.rating, review.comment, review.imageUrl || null, 'PENDING']);
      const rows = await this.listReviews({ productId: review.productId });
      return rows.find((item) => item.id === id) || null;
    },
    async updateReviewStatus(id, status) {
      await pool.query('UPDATE product_reviews SET status = ? WHERE id = ?', [status, id]);
      const rows = await this.listReviews();
      return rows.find((item) => item.id === id) || null;
    },
    async deleteReview(id) {
      const [result] = await pool.query('DELETE FROM product_reviews WHERE id = ?', [id]);
      return result.affectedRows > 0;
    },
    async listAdminProducts({ category, q } = {}) {
      const where = []; const params = [];
      if (category && category !== 'all') { where.push('category = ?'); params.push(category); }
      if (q) { where.push('(name LIKE ? OR description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
      const [rows] = await pool.query(`SELECT * FROM products ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY is_active DESC, sort_order, created_at DESC LIMIT 500`, params);
      return rows.map((row) => ({
        ...row, originalPrice: row.original_price, saleStartsAt: row.sale_starts_at, saleEndsAt: row.sale_ends_at,
        occasions: parseJson(row.occasions_json, []), options: parseJson(row.options_json, []),
        allowCustomRequest: Boolean(row.allow_custom_request), isMadeToOrder: Boolean(row.is_made_to_order),
        returnable: Boolean(row.returnable), customizable: Boolean(row.customizable), premium: Boolean(row.premium),
        isActive: Boolean(row.is_active), sortOrder: row.sort_order,
      }));
    },
    async listCategories() {
      const [rows] = await pool.query('SELECT id, name, slug, eyebrow, description, image, size, sort_order AS sortOrder, is_active AS isActive FROM categories WHERE is_active = 1 ORDER BY sort_order, name');
      return rows;
    },
    async getCategory(id) {
      const [rows] = await pool.query('SELECT * FROM categories WHERE id = ? LIMIT 1', [id]);
      return rows[0] ? { ...rows[0], sortOrder: rows[0].sort_order, isActive: Boolean(rows[0].is_active) } : null;
    },
    async createCategory(category) {
      await pool.query('INSERT INTO categories (id,name,slug,eyebrow,description,image,size,sort_order) VALUES (?,?,?,?,?,?,?,?)', [category.id, category.name, category.slug || category.id, category.eyebrow || '', category.description || '', category.image || '', category.size || 'm', category.sortOrder ?? 0]);
      return this.getCategory(category.id);
    },
    async updateCategory(id, updates) {
      const fields = []; const values = [];
      for (const [key, value] of Object.entries(updates)) {
        const col = { name: 'name', slug: 'slug', eyebrow: 'eyebrow', description: 'description', image: 'image', size: 'size', sortOrder: 'sort_order', isActive: 'is_active' }[key];
        if (col) { fields.push(`${col} = ?`); values.push(value); }
      }
      if (fields.length) {
        values.push(id);
        await pool.query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
      }
      return this.getCategory(id);
    },
    async deleteCategory(id) {
      const [res] = await pool.query('UPDATE categories SET is_active = 0 WHERE id = ?', [id]);
      return res.affectedRows > 0;
    },
    async getProduct(id) {
      const [rows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
      if (!rows[0]) return null;
      const row = rows[0];
      return {
        ...row,
        originalPrice: row.original_price,
        saleStartsAt: row.sale_starts_at,
        saleEndsAt: row.sale_ends_at,
        occasions: parseJson(row.occasions_json, []),
        options: parseJson(row.options_json, []),
        allowCustomRequest: Boolean(row.allow_custom_request),
        isMadeToOrder: Boolean(row.is_made_to_order),
        returnable: Boolean(row.returnable),
        customizable: Boolean(row.customizable),
        isActive: Boolean(row.is_active),
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      };
    },
    async createProduct(product) {
      await pool.query(
        'INSERT INTO products (id,slug,name,category,type,price,original_price,sale_starts_at,sale_ends_at,production,description,image,occasions_json,audience,customizable,allow_custom_request,is_made_to_order,returnable,disclaimer,care_instructions,options_json,sort_order,badge) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [product.id, product.slug, product.name, product.category, product.type || 'READYMADE', product.price ?? 0, product.originalPrice ?? null, product.saleStartsAt || null, product.saleEndsAt || null, product.production || 'Made to order', product.description || '', product.image || '', JSON.stringify(product.occasions || []), product.audience || 'all', Boolean(product.customizable), product.allowCustomRequest !== false, product.isMadeToOrder !== false, Boolean(product.returnable), product.disclaimer || 'Handmade; colours may vary.', product.careInstructions || 'Keep dry, handle with love.', JSON.stringify(product.options || []), product.sortOrder ?? 0, product.badge || 'New']
      );
      return this.getProduct(product.id);
    },
    async updateProduct(id, updates, actor = 'admin') {
      const fields = []; const values = [];
      const colMap = {
        name: 'name', slug: 'slug', category: 'category', type: 'type', price: 'price', originalPrice: 'original_price', saleStartsAt: 'sale_starts_at', saleEndsAt: 'sale_ends_at',
        production: 'production', description: 'description', image: 'image', occasions: 'occasions_json',
        audience: 'audience', customizable: 'customizable', allowCustomRequest: 'allow_custom_request',
        isMadeToOrder: 'is_made_to_order', returnable: 'returnable', disclaimer: 'disclaimer',
        careInstructions: 'care_instructions', options: 'options_json', sortOrder: 'sort_order',
        isActive: 'is_active', badge: 'badge',
      };
      const jsonFields = new Set(['occasions', 'options']);
      for (const [key, value] of Object.entries(updates)) {
        const col = colMap[key];
        if (col) {
          fields.push(`${col} = ?`);
          values.push(jsonFields.has(key) ? JSON.stringify(value ?? []) : value);
        }
      }
      const prev = await this.getProduct(id);
      if (fields.length) {
        values.push(id);
        await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
      }
      if (prev) {
        await pool.query('INSERT INTO audit_logs (actor, action, entity, entity_id, diff_json) VALUES (?,?,?,?,?)', [actor, 'UPDATE_PRODUCT', 'product', id, JSON.stringify({ before: { name: prev.name, price: prev.price }, after: updates })]);
      }
      return this.getProduct(id);
    },
    async deleteProduct(id, actor = 'admin') {
      const [res] = await pool.query('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
      if (res.affectedRows > 0) {
        await pool.query('INSERT INTO audit_logs (actor, action, entity, entity_id, diff_json) VALUES (?,?,?,?,?)', [actor, 'DELETE_PRODUCT', 'product', id, JSON.stringify({})]);
      }
      return res.affectedRows > 0;
    },
    async createUser(user) {
      await pool.query(
        'INSERT INTO users (id,email,password_hash,name,phone,role,google_id,avatar_url) VALUES (?,?,?,?,?,?,?,?)',
        [user.id, user.email.toLowerCase(), user.passwordHash || null, user.name, user.phone || '', user.role || 'USER', user.googleId || null, user.avatarUrl || null]
      );
      return this.getUserById(user.id);
    },
    async getUserByEmail(email, includeHash = false) {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [String(email).toLowerCase()]);
      if (!rows[0]) return null;
      const row = rows[0];
      const out = {
        id: row.id, email: row.email, name: row.name, phone: row.phone, role: row.role,
        googleId: row.google_id, avatarUrl: row.avatar_url, isActive: Boolean(row.is_active),
        createdAt: row.created_at, updatedAt: row.updated_at,
      };
      if (includeHash) out.passwordHash = row.password_hash;
      return out;
    },
    async getUserById(id) {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
      if (!rows[0]) return null;
      return {
        id: rows[0].id, email: rows[0].email, name: rows[0].name, phone: rows[0].phone, role: rows[0].role,
        googleId: rows[0].google_id, avatarUrl: rows[0].avatar_url, isActive: Boolean(rows[0].is_active),
      };
    },
    async updateUser(id, updates) {
      const fields = []; const values = [];
      const colMap = { name: 'name', phone: 'phone', role: 'role', avatarUrl: 'avatar_url', isActive: 'is_active' };
      for (const [key, value] of Object.entries(updates)) {
        const col = colMap[key];
        if (col) { fields.push(`${col} = ?`); values.push(value); }
      }
      if (fields.length) {
        values.push(id);
        await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      }
      return this.getUserById(id);
    },
    async listAdminUsers() {
      const [rows] = await pool.query("SELECT id, email, name, phone, role, is_active AS isActive, created_at AS createdAt FROM users WHERE role IN ('OWNER','ADMIN','MANAGER','STAFF') ORDER BY created_at");
      return rows;
    },
    async getEmailVerification(email) {
      const [rows] = await pool.query('SELECT email, name, phone, password_hash AS passwordHash, code_hash AS codeHash, expires_at AS expiresAt, attempts, last_sent_at AS lastSentAt FROM email_verification_requests WHERE email = ? LIMIT 1', [email]);
      return rows[0] || null;
    },
    async saveEmailVerification(record) {
      await pool.query('INSERT INTO email_verification_requests (email,name,phone,password_hash,code_hash,expires_at,attempts,last_sent_at) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), password_hash=VALUES(password_hash), code_hash=VALUES(code_hash), expires_at=VALUES(expires_at), attempts=VALUES(attempts), last_sent_at=VALUES(last_sent_at)', [record.email,record.name,record.phone,record.passwordHash,record.codeHash,record.expiresAt,record.attempts,record.lastSentAt]);
      return true;
    },
    async incrementEmailVerificationAttempts(email) {
      const [result] = await pool.query('UPDATE email_verification_requests SET attempts = attempts + 1 WHERE email = ?', [email]);
      return result.affectedRows > 0;
    },
    async deleteEmailVerification(email) {
      await pool.query('DELETE FROM email_verification_requests WHERE email = ?', [email]);
      return true;
    },
    async createPasswordResetToken(userId, tokenHash, expiresAt) {
      await pool.query('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)', [userId, tokenHash, expiresAt]);
    },
    async findPasswordResetToken(tokenHash) {
      const [rows] = await pool.query('SELECT id, user_id AS userId, token_hash AS tokenHash, expires_at AS expiresAt, used_at AS usedAt FROM password_reset_tokens WHERE token_hash = ? LIMIT 1', [tokenHash]);
      return rows[0] || null;
    },

    async recordManualPayment(id, payment, actor) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [[order]] = await connection.query('SELECT total, paid_amount FROM orders WHERE id = ? FOR UPDATE', [id]);
        if (!order) { await connection.rollback(); return null; }
        const amount = Number(payment.amount);
        const nextPaid = Number(order.paid_amount || 0) + amount;
        if (nextPaid > Number(order.total)) { await connection.rollback(); return { error: 'OVERPAYMENT' }; }
        await connection.query('INSERT INTO payment_records (order_id, amount, method, reference, note, created_by) VALUES (?,?,?,?,?,?)', [id, amount, payment.method || 'UPI', payment.reference || '', payment.note || '', actor]);
        const status = nextPaid >= Number(order.total) ? 'PAID' : nextPaid > 0 ? 'PARTIAL' : 'PENDING';
        const [current] = await connection.query('SELECT status FROM orders WHERE id = ? LIMIT 1', [id]);
        const nextStatus = status === 'PAID' && current[0]?.status === 'PENDING_PAYMENT' ? 'PENDING_CONFIRMATION' : current[0]?.status;
        await connection.query('UPDATE orders SET paid_amount = ?, balance_due = ?, payment_status = ?, status = ? WHERE id = ?', [nextPaid, Number(order.total) - nextPaid, status, nextStatus, id]);
        await connection.query('UPDATE orders SET reported_amount = 0, reported_reference = NULL WHERE id = ?', [id]);
        await connection.query('INSERT INTO audit_logs (actor, action, entity, entity_id, diff_json) VALUES (?,?,?,?,?)', [actor, 'RECORD_MANUAL_PAYMENT', 'order', id, JSON.stringify({ amount, method: payment.method || 'UPI', reference: payment.reference || '', paidAmount: nextPaid, balanceDue: Number(order.total) - nextPaid })]);
        await connection.commit();
        return this.getOrder(id);
      } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    },
    async consumePasswordResetToken(tokenHash) {
      const [res] = await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ? AND used_at IS NULL', [tokenHash]);
      return res.affectedRows > 0;
    },
    async updatePassword(userId, newPasswordHash) {
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);
      return this.getUserById(userId);
    },
    async getPublicSettings() { const [rows] = await pool.query('SELECT * FROM site_settings WHERE id = 1 LIMIT 1'); return rows[0] ? { ...catalogStoreSettings, storeStatus: rows[0].store_status, acceptingCustomRequests: Boolean(rows[0].accepting_custom_requests), pauseMessage: rows[0].pause_message, timezone: rows[0].timezone, orderCutoffTime: rows[0].order_cutoff_time, dailyOrderCapacity: rows[0].daily_order_capacity, dailyCustomCapacity: rows[0].daily_custom_capacity, maxActiveProductionOrders: rows[0].max_active_production_orders, giftWrapPrice: rows[0].gift_wrap_price, testMode: Boolean(rows[0].test_mode), upiId: rows[0].upi_id || '', upiQrImage: rows[0].upi_qr_image || '', homepageImages: parseJson(rows[0].homepage_images_json, {}), paymentInstructions: rows[0].payment_instructions || 'Pay the requested amount by UPI. We will start after confirming it.', announcementBar: { text: rows[0].announcement_text, link: rows[0].announcement_link, isActive: true } } : clone(catalogStoreSettings); },
    async listDeliveryAreas() { const [rows] = await pool.query('SELECT id, label, area_type AS areaType, fee, approval_required AS approvalRequired, is_active AS isActive FROM delivery_areas WHERE is_active = 1 ORDER BY id'); return rows; },
    async listDeliverySlots() { const [rows] = await pool.query('SELECT id, label, area, days, remaining FROM delivery_slots WHERE is_active = 1 ORDER BY id'); return rows; },

    // ── Orders ─────────────────────────────────────────────────────────
    async createOrder(order) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          'INSERT INTO orders (id,user_id,status,estimated_date,pickup_date,customer_name,customer_email,customer_phone,customer_note,delivery_area,delivery_method,handover_spot,delivery_slot,location_text,location_approval,subtotal,delivery_fee,gift_wrap_fee,total,payment_plan,advance_due,balance_due,payment_status,gift_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [order.id, order.userId || null, order.status, null, order.delivery?.pickupDate || null, order.customer.name, order.customer.email, order.customer.phone, order.customer.note, order.delivery.area, order.delivery.method, order.delivery.handoverSpot, order.delivery.slotId, order.delivery.locationText, order.pricing.locationApproval, order.pricing.subtotal, order.pricing.deliveryFee, order.pricing.giftWrapFee, order.pricing.total, order.pricing.paymentPlan, order.pricing.advanceDue, order.pricing.balanceDue, 'PENDING', JSON.stringify(order.gift)]
        );
        for (const item of order.pricing.lineItems) {
          await connection.query(
            'INSERT INTO order_items (order_id,product_id,product_name,quantity,unit_price,selected_json,customization_json) VALUES (?,?,?,?,?,?,?)',
            [order.id, item.productId, item.productName, item.quantity, item.unitPrice, JSON.stringify(item.selected), JSON.stringify(item.customization)]
          );
        }
        await connection.commit();
        return { ...order, cancellationAllowed: true };
      } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    },

    async getOrder(id) {
      const [rows] = await pool.query('SELECT *, user_id AS userId, estimated_date AS estimatedDate, pickup_date AS pickupDate, cancellation_allowed AS cancellationAllowed FROM orders WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    },

    async getOrderWithItems(id) {
      const [orderRows] = await pool.query('SELECT *, user_id AS userId, estimated_date AS estimatedDate, pickup_date AS pickupDate, cancellation_allowed AS cancellationAllowed FROM orders WHERE id = ? LIMIT 1', [id]);
      if (!orderRows[0]) return null;
      const [itemRows] = await pool.query('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', [id]);
      const order = orderRows[0];
      return {
        ...order,
        userId: order.user_id,
        estimatedDate: order.estimated_date,
        pickupDate: order.pickup_date,
        gift: parseJson(order.gift_json, {}),
        items: itemRows.map((item) => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          selected: parseJson(item.selected_json, []),
          customization: parseJson(item.customization_json, {}),
        })),
      };
    },

    async listOrders() {
      const [rows] = await pool.query("SELECT id, user_id AS userId, status, estimated_date AS estimatedDate, pickup_date AS pickupDate, customer_name AS customer, customer_email AS email, customer_phone AS phone, total, paid_amount AS paidAmount, reported_amount AS reportedAmount, reported_reference AS reportedReference, payment_status AS paymentStatus, payment_plan AS paymentPlan, delivery_area AS deliveryArea, delivery_method AS deliveryMethod, location_approval AS locationApproval, advance_due AS advanceDue, balance_due AS balanceDue, cancellation_allowed AS cancellationAllowed, (SELECT GROUP_CONCAT(oi.product_name ORDER BY oi.id SEPARATOR ', ') FROM order_items oi WHERE oi.order_id = orders.id) AS productNames, created_at AS createdAt FROM orders ORDER BY created_at DESC LIMIT 100");
      return rows;
    },

    async listOrdersByUser(userId) {
      const [rows] = await pool.query("SELECT id, status, estimated_date AS estimatedDate, pickup_date AS pickupDate, total, paid_amount AS paidAmount, balance_due AS balanceDue, payment_status AS paymentStatus, delivery_area AS deliveryArea, cancellation_allowed AS cancellationAllowed, (SELECT GROUP_CONCAT(oi.product_name ORDER BY oi.id SEPARATOR ', ') FROM order_items oi WHERE oi.order_id = orders.id) AS productNames, created_at AS createdAt FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", [userId]);
      return rows;
    },

    async setOrderCancellationAllowed(id, allowed) {
      const [result] = await pool.query('UPDATE orders SET cancellation_allowed = ? WHERE id = ?', [allowed, id]);
      if (!result.affectedRows) {
        const existing = await this.getOrder(id);
        if (!existing) return null;
      }
      return this.getOrder(id);
    },

    async cancelOrder(id, userId) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [[order]] = await connection.query(
          'SELECT user_id, cancellation_allowed FROM orders WHERE id = ? FOR UPDATE',
          [id]
        );
        if (!order) {
          await connection.rollback();
          return { error: 'ORDER_NOT_FOUND' };
        }
        if (String(order.user_id || '') !== String(userId)) {
          await connection.rollback();
          return { error: 'FORBIDDEN' };
        }
        if (!order.cancellation_allowed) {
          await connection.rollback();
          return { error: 'CANCELLATION_CLOSED' };
        }
        await connection.query(
          "DELETE FROM audit_logs WHERE (entity = 'order' AND entity_id = ?) OR (entity = 'order_query' AND entity_id IN (SELECT CAST(id AS CHAR) FROM order_queries WHERE order_id = ?))",
          [id, id]
        );
        await connection.query("DELETE FROM conversation_messages WHERE conversation_type = 'ORDER' AND entity_id = ?", [id]);
        await connection.query('DELETE FROM orders WHERE id = ?', [id]);
        await connection.commit();
        return { ok: true };
      } catch (error) { await connection.rollback(); throw error; }
      finally { connection.release(); }
    },

    async updateOrderEstimatedDate(id, estimatedDate, actor) {
      const [existing] = await pool.query('SELECT estimated_date FROM orders WHERE id = ? LIMIT 1', [id]);
      if (!existing[0]) return null;
      const prev = existing[0].estimated_date;
      await pool.query('UPDATE orders SET estimated_date = ? WHERE id = ?', [estimatedDate || null, id]);
      await pool.query('INSERT INTO audit_logs (actor, action, entity, entity_id, diff_json) VALUES (?,?,?,?,?)', [actor, 'UPDATE_ESTIMATED_DATE', 'order', id, JSON.stringify({ from: prev, to: estimatedDate })]);
      const [rows] = await pool.query('SELECT *, user_id AS userId, estimated_date AS estimatedDate, pickup_date AS pickupDate FROM orders WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    },

    async updateOrderStatus(id, status, actor) {
      const [existing] = await pool.query('SELECT status FROM orders WHERE id = ? LIMIT 1', [id]);
      if (!existing[0]) return null;
      const prev = existing[0].status;
      await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
      await pool.query('INSERT INTO audit_logs (actor, action, entity, entity_id, diff_json) VALUES (?,?,?,?,?)', [actor, 'UPDATE_STATUS', 'order', id, JSON.stringify({ from: prev, to: status })]);
      const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    },

    async updatePaymentStatus(id, paymentStatus, razorpayPaymentId) {
      const [existing] = await pool.query('SELECT status, payment_status FROM orders WHERE id = ? LIMIT 1', [id]);
      if (!existing[0]) return null;
      let newStatus = existing[0].status;
      if (paymentStatus === 'PAID' && newStatus === 'PENDING_PAYMENT') newStatus = 'PENDING_CONFIRMATION';
      await pool.query('UPDATE orders SET payment_status = ?, status = ? WHERE id = ?', [paymentStatus, newStatus, id]);
      await pool.query('INSERT INTO audit_logs (actor, action, entity, entity_id, diff_json) VALUES (?,?,?,?,?)', ['system', 'PAYMENT_UPDATE', 'order', id, JSON.stringify({ paymentStatus, razorpayPaymentId: razorpayPaymentId || null })]);
      const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    },
    async reportPayment(id, userId, amount, reference) {
      const [[order]] = await pool.query('SELECT total, paid_amount, user_id FROM orders WHERE id = ? LIMIT 1', [id]);
      if (!order || order.user_id !== userId) return null;
      const remaining = Number(order.total) - Number(order.paid_amount || 0);
      if (amount < 1 || amount > remaining) return { error: 'INVALID_AMOUNT' };
      await pool.query("UPDATE orders SET payment_status = 'AWAITING_VERIFICATION', reported_amount = ?, reported_reference = ? WHERE id = ?", [amount, reference || null, id]);
      return this.getOrder(id);
    },

    async updateLocationApproval(id, approval, actor) {
      const [existing] = await pool.query('SELECT id FROM orders WHERE id = ? LIMIT 1', [id]);
      if (!existing[0]) return null;
      await pool.query('UPDATE orders SET location_approval = ? WHERE id = ?', [approval, id]);
      await pool.query('INSERT INTO audit_logs (actor, action, entity, entity_id, diff_json) VALUES (?,?,?,?,?)', [actor, 'UPDATE_LOCATION_APPROVAL', 'order', id, JSON.stringify({ approval })]);
      const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    },

    // ── Custom Requests ────────────────────────────────────────────────
    async createCustomRequest(request) {
      await pool.query(
        'INSERT INTO custom_requests (id,user_id,product_id,product_name,title,customer_name,customer_email,customer_phone,description,needed_by,budget,reference_urls_json,size,colours,occasion,pickup_location,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [request.id, request.userId || null, request.productId, request.productName, request.title, request.customer.name, request.customer.email, request.customer.phone, request.description, request.neededBy, request.budget, JSON.stringify(request.referenceUrls), request.size, request.colours, request.occasion, request.pickupLocation || '', 'NEW']
      );
      return request;
    },

    async getCustomRequest(id) {
      const [rows] = await pool.query('SELECT * FROM custom_requests WHERE id = ? LIMIT 1', [id]);
      if (!rows[0]) return null;
      const row = rows[0];
      return { ...row, userId: row.user_id, pickupLocation: row.pickup_location, customer: { name: row.customer_name, email: row.customer_email, phone: row.customer_phone }, referenceUrls: parseJson(row.reference_urls_json, []), quote: parseJson(row.quote_json, null) };
    },

    async listCustomRequests() {
      const [rows] = await pool.query('SELECT id, user_id AS userId, title, customer_name AS customer, customer_email AS email, customer_phone AS phone, description, reference_urls_json AS referenceUrls, status, needed_by AS neededBy, pickup_location AS pickupLocation, budget, occasion, quote_json AS quote, created_at AS createdAt FROM custom_requests ORDER BY created_at DESC LIMIT 100');
      return rows.map((row) => ({ ...row, referenceUrls: parseJson(row.referenceUrls, []), quote: parseJson(row.quote, null) }));
    },
    async listCustomRequestsByUser(userId) {
      const [rows] = await pool.query('SELECT id, user_id AS userId, title, customer_name AS customer, customer_email AS email, customer_phone AS phone, status, needed_by AS neededBy, budget, occasion, quote_json AS quote, created_at AS createdAt FROM custom_requests WHERE user_id = ? ORDER BY created_at DESC', [userId]);
      return rows.map((row) => ({ ...row, quote: parseJson(row.quote, null) }));
    },
    async clearCustomRequestMedia(id) {
      const [[row]] = await pool.query('SELECT reference_urls_json FROM custom_requests WHERE id = ? LIMIT 1', [id]);
      if (!row) return null;
      await pool.query("UPDATE custom_requests SET reference_urls_json = '[]' WHERE id = ?", [id]);
      return parseJson(row.reference_urls_json, []);
    },

    async updateCustomRequestStatus(id, status, quoteJson, actor) {
      const [existing] = await pool.query('SELECT status FROM custom_requests WHERE id = ? LIMIT 1', [id]);
      if (!existing[0]) return null;
      const prev = existing[0].status;
      if (quoteJson) {
        await pool.query('UPDATE custom_requests SET status = ?, quote_json = ? WHERE id = ?', [status, JSON.stringify(quoteJson), id]);
      } else {
        await pool.query('UPDATE custom_requests SET status = ? WHERE id = ?', [status, id]);
      }
      await pool.query('INSERT INTO audit_logs (actor, action, entity, entity_id, diff_json) VALUES (?,?,?,?,?)', [actor, 'UPDATE_REQUEST_STATUS', 'custom_request', id, JSON.stringify({ from: prev, to: status, quote: quoteJson || null })]);
      const [rows] = await pool.query('SELECT * FROM custom_requests WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    },

    // ── Admin Summary & Logs ───────────────────────────────────────────
    async adminSummary() {
      const [[ordersToday]] = await pool.query('SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = CURRENT_DATE');
      const [[pendingQuotes]] = await pool.query("SELECT COUNT(*) AS count FROM custom_requests WHERE status IN ('NEW','QUOTE_SENT')");
      const [[inProduction]] = await pool.query("SELECT COUNT(*) AS count FROM orders WHERE status = 'IN_PRODUCTION'");
      const [[totalOrders]] = await pool.query('SELECT COUNT(*) AS count FROM orders');
      const [[revenue]] = await pool.query('SELECT COALESCE(SUM(total),0) AS total FROM orders');
      const [[pendingPayments]] = await pool.query("SELECT COUNT(*) AS count FROM orders WHERE status = 'PENDING_PAYMENT'");
      return {
        ordersToday: Number(ordersToday.count),
        pendingQuotes: Number(pendingQuotes.count),
        inProduction: Number(inProduction.count),
        totalOrders: Number(totalOrders.count),
        totalRevenue: Number(revenue.total),
        pendingPayments: Number(pendingPayments.count),
        databaseMode: getDatabaseMode(),
      };
    },

    async logNotification(entry) {
      await pool.query(
        'INSERT INTO notification_logs (event_type, recipient, channel, status, attempts, error_text) VALUES (?,?,?,?,?,?)',
        [entry.eventType || 'order', entry.recipient || '', entry.channel || 'email', entry.status || 'sent', entry.attempts || 1, entry.error || '']
      );
    },

    async listAuditLogs(limit = 50) {
      const [rows] = await pool.query('SELECT id, actor, action, entity, entity_id AS entityId, diff_json AS diff, created_at AS createdAt FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
      return rows.map((r) => ({ ...r, diff: parseJson(r.diff, {}) }));
    },

    async listNotificationLogs(limit = 50) {
      const [rows] = await pool.query('SELECT id, event_type AS eventType, recipient, channel, status, attempts, error_text AS error, created_at AS createdAt FROM notification_logs ORDER BY created_at DESC LIMIT ?', [limit]);
      return rows;
    },

    async updateSettings(updates) {
      const columns = [];
      const values = [];
      const allowed = ['store_status', 'accepting_custom_requests', 'pause_message', 'announcement_text', 'announcement_link', 'order_cutoff_time', 'daily_order_capacity', 'daily_custom_capacity', 'max_active_production_orders', 'gift_wrap_price', 'test_mode'];
      const mapped = { upiId: 'upi_id', upiQrImage: 'upi_qr_image', paymentInstructions: 'payment_instructions', homepageImages: 'homepage_images_json' };
      for (const [key, value] of Object.entries(updates)) {
        const column = mapped[key] || (allowed.includes(key) ? key : null);
        if (column && !columns.includes(column)) { columns.push(column); values.push(key === 'homepageImages' ? JSON.stringify(value || {}) : value); }
      }
      if (columns.length > 0) {
        // Upsert the singleton row so settings persist even before it exists.
        const pairs = columns.map((column, index) => [column, values[index]]);
        for (const required of ['pause_message', 'announcement_text']) {
          if (!columns.includes(required)) pairs.push([required, '']);
        }
        const cols = pairs.map(([column]) => column);
        const vals = pairs.map(([, value]) => value);
        const placeholders = cols.map(() => '?').join(', ');
        const assignments = cols.map((column) => `${column} = VALUES(${column})`).join(', ');
        await pool.query(
          `INSERT INTO site_settings (id, ${cols.join(', ')}) VALUES (1, ${placeholders}) ON DUPLICATE KEY UPDATE ${assignments}`,
          vals
        );
      }
      return this.getPublicSettings();
    },

    // ── Order Queries (Ask a Query) ───────────────────────────────────
    async createOrderQuery({ orderId, userId, message }) {
      const [res] = await pool.query(
        'INSERT INTO order_queries (order_id, user_id, message) VALUES (?,?,?)',
        [orderId, userId, message]
      );
      const [[row]] = await pool.query('SELECT * FROM order_queries WHERE id = ? LIMIT 1', [res.insertId]);
      return row ? { ...row, orderId: row.order_id, userId: row.user_id, adminReply: row.admin_reply, repliedAt: row.replied_at } : null;
    },
    async listOrderQueriesByOrder(orderId) {
      const [rows] = await pool.query('SELECT *, order_id AS orderId, user_id AS userId, admin_reply AS adminReply, replied_at AS repliedAt FROM order_queries WHERE order_id = ? ORDER BY created_at DESC', [orderId]);
      return rows;
    },
    async listAllOrderQueries() {
      const [rows] = await pool.query(`
        SELECT q.id, q.order_id AS orderId, q.user_id AS userId, q.message, q.admin_reply AS adminReply,
               q.status, q.created_at AS createdAt, q.replied_at AS repliedAt,
               o.customer_name AS customerName, o.customer_email AS customerEmail,
               o.total AS orderTotal, o.status AS orderStatus
        FROM order_queries q
        LEFT JOIN orders o ON o.id = q.order_id
        ORDER BY q.created_at DESC LIMIT 200
      `);
      return rows;
    },
    async replyToOrderQuery(id, reply, actor) {
      const [existing] = await pool.query('SELECT status FROM order_queries WHERE id = ? LIMIT 1', [id]);
      if (!existing[0]) return null;
      await pool.query('UPDATE order_queries SET admin_reply = ?, status = ?, replied_at = NOW() WHERE id = ?', [reply, 'REPLIED', id]);
      await pool.query('INSERT INTO audit_logs (actor, action, entity, entity_id, diff_json) VALUES (?,?,?,?,?)', [actor, 'REPLY_QUERY', 'order_query', String(id), JSON.stringify({ reply })]);
      const [[row]] = await pool.query('SELECT *, order_id AS orderId, user_id AS userId, admin_reply AS adminReply, replied_at AS repliedAt FROM order_queries WHERE id = ? LIMIT 1', [id]);
      return row || null;
    },
    async addConversationMessage({ type, entityId, userId, senderRole, message }) {
      const [result] = await pool.query('INSERT INTO conversation_messages (conversation_type, entity_id, user_id, sender_role, message) VALUES (?,?,?,?,?)', [type, entityId, userId, senderRole, message]);
      const [[row]] = await pool.query('SELECT id, conversation_type AS conversationType, entity_id AS entityId, user_id AS userId, sender_role AS senderRole, message, created_at AS createdAt FROM conversation_messages WHERE id = ?', [result.insertId]);
      return row || null;
    },
    async listConversationMessages(type, entityId) {
      const [rows] = await pool.query('SELECT id, conversation_type AS conversationType, entity_id AS entityId, user_id AS userId, sender_role AS senderRole, message, created_at AS createdAt FROM conversation_messages WHERE conversation_type = ? AND entity_id = ? ORDER BY created_at ASC', [type, entityId]);
      return rows;
    },
    async listConversations() {
      const [rows] = await pool.query(`SELECT m.conversation_type AS conversationType, m.entity_id AS entityId, m.user_id AS userId,
        MAX(m.created_at) AS updatedAt, SUBSTRING_INDEX(GROUP_CONCAT(m.message ORDER BY m.created_at DESC SEPARATOR '\\n'), '\\n', 1) AS lastMessage,
        CASE WHEN m.conversation_type = 'ORDER' THEN o.customer_name ELSE r.customer_name END AS customerName,
        CASE WHEN m.conversation_type = 'ORDER' THEN o.customer_phone ELSE r.customer_phone END AS customerPhone
        FROM conversation_messages m LEFT JOIN orders o ON m.conversation_type = 'ORDER' AND o.id = m.entity_id
        LEFT JOIN custom_requests r ON m.conversation_type = 'REQUEST' AND r.id = m.entity_id
        GROUP BY m.conversation_type, m.entity_id, m.user_id ORDER BY updatedAt DESC LIMIT 200`);
      return rows;
    },
    async deleteConversation(type, entityId) {
      await pool.query('DELETE FROM conversation_messages WHERE conversation_type = ? AND entity_id = ?', [type, entityId]);
      return true;
    },
  };
}

export function createRepository() {
  const pool = getPool();
  const memRepo = memoryRepository();
  if (!pool) return memRepo;

  const sqlRepo = mysqlRepository(pool);
  const resilient = { mode: 'hybrid-resilient' };
  const keys = Object.keys(sqlRepo);

  for (const key of keys) {
    if (typeof sqlRepo[key] === 'function') {
      resilient[key] = async function (...args) {
        try {
          return await sqlRepo[key](...args);
        } catch (err) {
          const isDbDown = err && (
            err.code === 'ECONNREFUSED' ||
            err.name === 'AggregateError' ||
            (Array.isArray(err.errors) && err.errors.some((e) => e.code === 'ECONNREFUSED' || /ECONNREFUSED/i.test(e.message))) ||
            err.code === 'ETIMEDOUT' ||
            err.code === 'PROTOCOL_CONNECTION_LOST' ||
            err.code === 'ER_ACCESS_DENIED_ERROR' ||
            err.code === 'ENOTFOUND' ||
            err.code === 'ER_BAD_DB_ERROR' ||
            err.code === 'ER_NO_SUCH_TABLE' ||
            (err.message && /connect ECONNREFUSED|connection lost|closed|stopped/i.test(err.message))
          );
          if (isDbDown) {
            console.warn(`[db-fallback] MySQL is stopped/unavailable (${err.code || err.message}). Gracefully using memory store for "${key}".`);
            return await memRepo[key](...args);
          }
          throw err;
        }
      };
    } else {
      resilient[key] = sqlRepo[key];
    }
  }

  return resilient;
}

export function newEntityId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}
