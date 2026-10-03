import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { catalogProducts, catalogCategories, catalogDeliveryAreas, catalogDeliverySlots, catalogStoreSettings, publicProduct } from './catalog.js';
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
  users: [
    {
      id: 'admin-1',
      email: 'aryangupta75990@gmail.com',
      passwordHash: bcrypt.hashSync('Aryan@999', 10),
      name: 'Aryan Gupta',
      phone: '+91 99999 99999',
      role: 'OWNER',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'admin-2',
      email: 'heychosenforu@gmail.com',
      passwordHash: bcrypt.hashSync('heychosenforu@gmail.com', 10),
      name: 'Chosen For U Studio',
      phone: '+91 99999 99998',
      role: 'OWNER',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-sample',
      email: 'ananya@example.com',
      passwordHash: bcrypt.hashSync('password123', 10),
      name: 'Ananya Sharma',
      phone: '+91 98 7654 3210',
      role: 'USER',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],
  resetTokens: [],
  products: clone(catalogProducts),
  categories: clone(catalogCategories),
};

function memoryRepository() {
  return {
    mode: 'memory-fallback',
    async listProducts({ category, occasion, q } = {}) {
      return memory.products.filter((product) => (!category || category === 'all' || product.category === category) && (!occasion || occasion === 'all' || (product.occasions || []).includes(occasion)) && (!q || `${product.name} ${product.description}`.toLowerCase().includes(q.toLowerCase()))).map(publicProduct);
    },
    async getProduct(id) {
      const product = memory.products.find((p) => p.id === id);
      return product ? clone(product) : null;
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
    async getPublicSettings() { return clone(catalogStoreSettings); },
    async listDeliveryAreas() { return catalogDeliveryAreas.map((label, index) => ({ id: String(index + 1), label, areaType: index === 0 ? 'CAMPUS' : label.startsWith('Other') ? 'MANUAL' : 'LOCAL', fee: index === 0 ? 0 : 50, approvalRequired: label.startsWith('Other'), isActive: true })); },
    async listDeliverySlots() { return clone(catalogDeliverySlots); },
    async createOrder(order) { const saved = { ...clone(order), id: order.id || `EFU-${1043 + memory.orders.length}`, userId: order.userId || null, estimatedDate: null, pickupDate: order.delivery?.pickupDate || null, createdAt: new Date().toISOString() }; memory.orders.unshift(saved); return saved; },
    async getOrder(id) { return memory.orders.find((order) => order.id === id) || null; },
    async getOrderWithItems(id) {
      const order = memory.orders.find((o) => o.id === id);
      if (!order) return null;
      return clone({ ...order, items: order.pricing?.lineItems || [] });
    },
    async listOrders() { return clone(memory.orders); },
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
    async listCustomRequests() { return clone(memory.requests); },
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
    async getUserByGoogleId(googleId) {
      const user = memory.users.find((u) => u.googleId === googleId);
      return user ? clone(user) : null;
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
    async listOrdersByUser(userId) { return clone(memory.orders.filter((o) => o.userId === userId || o.user_id === userId)); },
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
      return rows.map((row) => publicProduct({ ...row, originalPrice: row.original_price, startingFrom: false, occasions: parseJson(row.occasions_json, []), options: parseJson(row.options_json, []), allowCustomRequest: Boolean(row.allow_custom_request), isMadeToOrder: Boolean(row.is_made_to_order), returnable: Boolean(row.returnable), customizable: Boolean(row.customizable), premium: false }));
    },
    async listCategories() {
      const [rows] = await pool.query('SELECT id, name, slug, eyebrow, description, image, size, sort_order AS sortOrder, is_active AS isActive FROM categories WHERE is_active = 1 ORDER BY sort_order, name');
      if (rows.length === 0) return clone(catalogCategories);
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
        'INSERT INTO products (id,slug,name,category,type,price,original_price,production,description,image,occasions_json,audience,customizable,allow_custom_request,is_made_to_order,returnable,disclaimer,care_instructions,options_json,sort_order,badge) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [product.id, product.slug, product.name, product.category, product.type || 'READYMADE', product.price ?? 0, product.originalPrice ?? null, product.production || 'Made to order', product.description || '', product.image || '', JSON.stringify(product.occasions || []), product.audience || 'all', Boolean(product.customizable), product.allowCustomRequest !== false, product.isMadeToOrder !== false, Boolean(product.returnable), product.disclaimer || 'Handmade; colours may vary.', product.careInstructions || 'Keep dry, handle with love.', JSON.stringify(product.options || []), product.sortOrder ?? 0, product.badge || 'New']
      );
      return this.getProduct(product.id);
    },
    async updateProduct(id, updates, actor = 'admin') {
      const fields = []; const values = [];
      const colMap = {
        name: 'name', slug: 'slug', category: 'category', type: 'type', price: 'price', originalPrice: 'original_price',
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
    async getUserByGoogleId(googleId) {
      const [rows] = await pool.query('SELECT * FROM users WHERE google_id = ? LIMIT 1', [googleId]);
      if (!rows[0]) return null;
      return {
        id: rows[0].id, email: rows[0].email, name: rows[0].name, phone: rows[0].phone, role: rows[0].role,
        googleId: rows[0].google_id, avatarUrl: rows[0].avatar_url, isActive: Boolean(rows[0].is_active),
      };
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
    async createPasswordResetToken(userId, tokenHash, expiresAt) {
      await pool.query('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)', [userId, tokenHash, expiresAt]);
    },
    async findPasswordResetToken(tokenHash) {
      const [rows] = await pool.query('SELECT id, user_id AS userId, token_hash AS tokenHash, expires_at AS expiresAt, used_at AS usedAt FROM password_reset_tokens WHERE token_hash = ? LIMIT 1', [tokenHash]);
      return rows[0] || null;
    },
    async consumePasswordResetToken(tokenHash) {
      const [res] = await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ? AND used_at IS NULL', [tokenHash]);
      return res.affectedRows > 0;
    },
    async updatePassword(userId, newPasswordHash) {
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);
      return this.getUserById(userId);
    },
    async getPublicSettings() { const [rows] = await pool.query('SELECT * FROM site_settings WHERE id = 1 LIMIT 1'); return rows[0] ? { ...catalogStoreSettings, storeStatus: rows[0].store_status, acceptingCustomRequests: Boolean(rows[0].accepting_custom_requests), pauseMessage: rows[0].pause_message, timezone: rows[0].timezone, orderCutoffTime: rows[0].order_cutoff_time, dailyOrderCapacity: rows[0].daily_order_capacity, dailyCustomCapacity: rows[0].daily_custom_capacity, maxActiveProductionOrders: rows[0].max_active_production_orders, giftWrapPrice: rows[0].gift_wrap_price, testMode: Boolean(rows[0].test_mode), announcementBar: { text: rows[0].announcement_text, link: rows[0].announcement_link, isActive: true } } : clone(catalogStoreSettings); },
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
        return order;
      } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    },

    async getOrder(id) {
      const [rows] = await pool.query('SELECT *, user_id AS userId, estimated_date AS estimatedDate, pickup_date AS pickupDate FROM orders WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    },

    async getOrderWithItems(id) {
      const [orderRows] = await pool.query('SELECT *, user_id AS userId, estimated_date AS estimatedDate, pickup_date AS pickupDate FROM orders WHERE id = ? LIMIT 1', [id]);
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
      const [rows] = await pool.query('SELECT id, user_id AS userId, status, estimated_date AS estimatedDate, pickup_date AS pickupDate, customer_name AS customer, customer_email AS email, customer_phone AS phone, total, payment_status AS paymentStatus, payment_plan AS paymentPlan, delivery_area AS deliveryArea, delivery_method AS deliveryMethod, location_approval AS locationApproval, advance_due AS advanceDue, balance_due AS balanceDue, created_at AS createdAt FROM orders ORDER BY created_at DESC LIMIT 100');
      return rows;
    },

    async listOrdersByUser(userId) {
      const [rows] = await pool.query('SELECT id, status, estimated_date AS estimatedDate, pickup_date AS pickupDate, total, payment_status AS paymentStatus, delivery_area AS deliveryArea, created_at AS createdAt FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [userId]);
      return rows;
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
        'INSERT INTO custom_requests (id,product_id,product_name,title,customer_name,customer_email,customer_phone,description,needed_by,budget,reference_urls_json,size,colours,occasion,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [request.id, request.productId, request.productName, request.title, request.customer.name, request.customer.email, request.customer.phone, request.description, request.neededBy, request.budget, JSON.stringify(request.referenceUrls), request.size, request.colours, request.occasion, 'NEW']
      );
      return request;
    },

    async getCustomRequest(id) {
      const [rows] = await pool.query('SELECT * FROM custom_requests WHERE id = ? LIMIT 1', [id]);
      if (!rows[0]) return null;
      const row = rows[0];
      return { ...row, referenceUrls: parseJson(row.reference_urls_json, []), quote: parseJson(row.quote_json, null) };
    },

    async listCustomRequests() {
      const [rows] = await pool.query('SELECT id, title, customer_name AS customer, customer_email AS email, customer_phone AS phone, status, needed_by AS neededBy, budget, occasion, created_at AS createdAt FROM custom_requests ORDER BY created_at DESC LIMIT 100');
      return rows;
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
      const fields = [];
      const values = [];
      const allowed = ['store_status', 'accepting_custom_requests', 'pause_message', 'announcement_text', 'announcement_link', 'order_cutoff_time', 'daily_order_capacity', 'daily_custom_capacity', 'max_active_production_orders', 'gift_wrap_price', 'test_mode'];
      for (const [key, value] of Object.entries(updates)) {
        if (allowed.includes(key)) { fields.push(`${key} = ?`); values.push(value); }
      }
      if (fields.length > 0) {
        values.push(1);
        await pool.query(`UPDATE site_settings SET ${fields.join(', ')} WHERE id = ?`, values);
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
