CREATE TABLE IF NOT EXISTS site_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  store_status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  accepting_custom_requests BOOLEAN NOT NULL DEFAULT TRUE,
  pause_message VARCHAR(255) NOT NULL,
  announcement_text VARCHAR(255) NOT NULL,
  announcement_link VARCHAR(255) NOT NULL DEFAULT '/custom-request',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  order_cutoff_time VARCHAR(10) NOT NULL DEFAULT '20:00',
  daily_order_capacity INT UNSIGNED NOT NULL DEFAULT 25,
  daily_custom_capacity INT UNSIGNED NOT NULL DEFAULT 8,
  max_active_production_orders INT UNSIGNED NOT NULL DEFAULT 30,
  quote_expiry_days INT UNSIGNED NOT NULL DEFAULT 3,
  gift_wrap_price INT UNSIGNED NOT NULL DEFAULT 79,
  prices_include_tax BOOLEAN NOT NULL DEFAULT TRUE,
  test_mode BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  slug VARCHAR(160) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  type VARCHAR(30) NOT NULL,
  price INT UNSIGNED NOT NULL,
  original_price INT UNSIGNED NULL,
  production VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  image VARCHAR(1000) NOT NULL,
  occasions_json JSON NOT NULL,
  audience VARCHAR(80) NOT NULL,
  customizable BOOLEAN NOT NULL DEFAULT FALSE,
  allow_custom_request BOOLEAN NOT NULL DEFAULT TRUE,
  is_made_to_order BOOLEAN NOT NULL DEFAULT TRUE,
  returnable BOOLEAN NOT NULL DEFAULT FALSE,
  disclaimer VARCHAR(500) NOT NULL,
  care_instructions VARCHAR(500) NOT NULL,
  options_json JSON NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_products_category (category),
  INDEX idx_products_active (is_active)
);

CREATE TABLE IF NOT EXISTS delivery_areas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(180) NOT NULL UNIQUE,
  area_type VARCHAR(30) NOT NULL DEFAULT 'LOCAL',
  fee INT UNSIGNED NOT NULL DEFAULT 50,
  approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_slots (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  label VARCHAR(160) NOT NULL,
  area VARCHAR(180) NOT NULL,
  days VARCHAR(80) NOT NULL,
  remaining INT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDING_PAYMENT',
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(180) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_note VARCHAR(1000) NOT NULL DEFAULT '',
  delivery_area VARCHAR(180) NOT NULL,
  delivery_method VARCHAR(20) NOT NULL,
  handover_spot VARCHAR(120) NOT NULL DEFAULT '',
  delivery_slot VARCHAR(80) NOT NULL DEFAULT '',
  location_text VARCHAR(240) NOT NULL DEFAULT '',
  location_approval VARCHAR(20) NOT NULL DEFAULT 'NOT_NEEDED',
  subtotal INT UNSIGNED NOT NULL,
  delivery_fee INT UNSIGNED NOT NULL DEFAULT 0,
  gift_wrap_fee INT UNSIGNED NOT NULL DEFAULT 0,
  total INT UNSIGNED NOT NULL,
  payment_plan VARCHAR(40) NOT NULL,
  advance_due INT UNSIGNED NOT NULL DEFAULT 0,
  balance_due INT UNSIGNED NOT NULL DEFAULT 0,
  payment_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  gift_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_status (status),
  INDEX idx_orders_email (customer_email),
  INDEX idx_orders_created (created_at)
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(40) NOT NULL,
  product_id VARCHAR(80) NOT NULL,
  product_name VARCHAR(180) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price INT UNSIGNED NOT NULL,
  selected_json JSON NOT NULL,
  customization_json JSON NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_items_order (order_id)
);

CREATE TABLE IF NOT EXISTS custom_requests (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  product_id VARCHAR(80) NOT NULL DEFAULT '',
  product_name VARCHAR(180) NOT NULL DEFAULT '',
  title VARCHAR(160) NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(180) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  needed_by VARCHAR(40) NOT NULL DEFAULT '',
  budget VARCHAR(80) NOT NULL DEFAULT '',
  reference_urls_json JSON NOT NULL,
  size VARCHAR(120) NOT NULL DEFAULT '',
  colours VARCHAR(240) NOT NULL DEFAULT '',
  occasion VARCHAR(80) NOT NULL DEFAULT '',
  status VARCHAR(40) NOT NULL DEFAULT 'NEW',
  quote_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_requests_status (status),
  INDEX idx_requests_email (customer_email)
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(80) NOT NULL,
  recipient VARCHAR(180) NOT NULL DEFAULT '',
  channel VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  error_text VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor VARCHAR(120) NOT NULL,
  action VARCHAR(120) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  diff_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity, entity_id),
  INDEX idx_audit_created (created_at)
);
