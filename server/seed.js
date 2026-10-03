import 'dotenv/config';
import { catalogProducts, catalogCategories, catalogDeliveryAreas, catalogDeliverySlots, catalogStoreSettings } from './catalog.js';
import { closePool, getPool } from './db.js';

const pool = getPool();
if (!pool) {
  console.error('DATABASE_URL is not configured; no seed was run.');
  process.exit(1);
}

try {
  await pool.query('INSERT INTO site_settings (id,store_status,accepting_custom_requests,pause_message,announcement_text,announcement_link,timezone,order_cutoff_time,daily_order_capacity,daily_custom_capacity,max_active_production_orders,quote_expiry_days,gift_wrap_price,prices_include_tax,test_mode) VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id', [catalogStoreSettings.storeStatus, catalogStoreSettings.acceptingCustomRequests, catalogStoreSettings.pauseMessage, catalogStoreSettings.announcementBar.text, catalogStoreSettings.announcementBar.link, catalogStoreSettings.timezone, catalogStoreSettings.orderCutoffTime, catalogStoreSettings.dailyOrderCapacity, catalogStoreSettings.dailyCustomCapacity, catalogStoreSettings.maxActiveProductionOrders, catalogStoreSettings.quoteExpiryDays, catalogStoreSettings.giftWrapPrice, catalogStoreSettings.pricesIncludeTax, catalogStoreSettings.testMode]);
  for (const [index, product] of catalogProducts.entries()) await pool.query('INSERT INTO products (id,slug,name,category,type,price,original_price,production,description,image,occasions_json,audience,customizable,allow_custom_request,is_made_to_order,returnable,disclaimer,care_instructions,options_json,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), description=VALUES(description), options_json=VALUES(options_json), is_active=1', [product.id, product.slug, product.name, product.category, product.type, product.price, product.originalPrice ?? null, product.production, product.description, product.image, JSON.stringify(product.occasions), product.audience, product.customizable, product.allowCustomRequest, product.isMadeToOrder, product.returnable, product.disclaimer, product.careInstructions, JSON.stringify(product.options ?? []), index]);
  for (const [index, category] of catalogCategories.entries()) await pool.query('INSERT INTO categories (id,name,slug,eyebrow,description,image,size,sort_order) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), image=VALUES(image), description=VALUES(description), is_active=1', [category.id, category.name, category.slug ?? category.id, category.eyebrow ?? '', category.description ?? '', category.image ?? '', category.size ?? 'm', index]);
  for (const [index, label] of catalogDeliveryAreas.entries()) await pool.query('INSERT INTO delivery_areas (label,area_type,fee,approval_required) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE is_active=1', [label, index === 0 ? 'CAMPUS' : label.startsWith('Other') ? 'MANUAL' : 'LOCAL', index === 0 ? 0 : 50, label.startsWith('Other')]);
  for (const slot of catalogDeliverySlots) await pool.query('INSERT INTO delivery_slots (id,label,area,days,remaining) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE label=VALUES(label), remaining=VALUES(remaining), is_active=1', [slot.id, slot.label, slot.area, slot.days, slot.remaining]);
  console.log(`Seeded ${catalogProducts.length} products, ${catalogCategories.length} categories, ${catalogDeliveryAreas.length} delivery areas and ${catalogDeliverySlots.length} slots.`);
} finally {
  await closePool();
}
