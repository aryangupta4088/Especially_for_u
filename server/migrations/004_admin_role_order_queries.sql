-- Migration 004: Admin signup role, order_queries table, pickup column changes

-- order_queries table for Track Your Order feature
CREATE TABLE IF NOT EXISTS order_queries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(40) NOT NULL,
  user_id VARCHAR(80) NOT NULL,
  message TEXT NOT NULL,
  admin_reply TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_queries_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_queries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_oq_order (order_id),
  INDEX idx_oq_user (user_id),
  INDEX idx_oq_status (status)
);

-- Add user_id to orders so we can track ownership
SET @dbname = DATABASE();
SET @tablename = 'orders';
SET @columnname = 'user_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_schema = @dbname)
      AND (table_name = @tablename)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(80) NULL AFTER id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index on orders.user_id
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_schema = @dbname)
      AND (table_name = 'orders')
      AND (index_name = 'idx_orders_user')
  ) > 0,
  'SELECT 1',
  'ALTER TABLE orders ADD INDEX idx_orders_user (user_id)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
