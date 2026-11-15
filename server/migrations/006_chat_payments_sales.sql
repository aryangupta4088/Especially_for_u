-- Add product sale windows and manual payment tracking.
SET @dbname = DATABASE();

SET @tablename = 'products';
SET @columnname = 'sale_starts_at';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema=@dbname AND table_name=@tablename AND column_name=@columnname)>0,'SELECT 1',CONCAT('ALTER TABLE ',@tablename,' ADD COLUMN sale_starts_at DATETIME NULL')));
PREPARE addColumn FROM @preparedStatement; EXECUTE addColumn; DEALLOCATE PREPARE addColumn;
SET @columnname = 'sale_ends_at';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema=@dbname AND table_name=@tablename AND column_name=@columnname)>0,'SELECT 1',CONCAT('ALTER TABLE ',@tablename,' ADD COLUMN sale_ends_at DATETIME NULL')));
PREPARE addColumn FROM @preparedStatement; EXECUTE addColumn; DEALLOCATE PREPARE addColumn;

SET @tablename = 'orders';
SET @columnname = 'paid_amount';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema=@dbname AND table_name=@tablename AND column_name=@columnname)>0,'SELECT 1',CONCAT('ALTER TABLE ',@tablename,' ADD COLUMN paid_amount INT UNSIGNED NOT NULL DEFAULT 0')));
PREPARE addColumn FROM @preparedStatement; EXECUTE addColumn; DEALLOCATE PREPARE addColumn;
SET @columnname = 'reported_amount';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema=@dbname AND table_name=@tablename AND column_name=@columnname)>0,'SELECT 1',CONCAT('ALTER TABLE ',@tablename,' ADD COLUMN reported_amount INT UNSIGNED NOT NULL DEFAULT 0')));
PREPARE addColumn FROM @preparedStatement; EXECUTE addColumn; DEALLOCATE PREPARE addColumn;
SET @columnname = 'reported_reference';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema=@dbname AND table_name=@tablename AND column_name=@columnname)>0,'SELECT 1',CONCAT('ALTER TABLE ',@tablename,' ADD COLUMN reported_reference VARCHAR(120) NULL')));
PREPARE addColumn FROM @preparedStatement; EXECUTE addColumn; DEALLOCATE PREPARE addColumn;
UPDATE orders SET paid_amount = total, balance_due = 0 WHERE payment_status = 'PAID' AND paid_amount = 0;

SET @tablename = 'site_settings';
SET @columnname = 'upi_id';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema=@dbname AND table_name=@tablename AND column_name=@columnname)>0,'SELECT 1',CONCAT('ALTER TABLE ',@tablename,' ADD COLUMN upi_id VARCHAR(120) NULL')));
PREPARE addColumn FROM @preparedStatement; EXECUTE addColumn; DEALLOCATE PREPARE addColumn;
SET @columnname = 'upi_qr_image';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema=@dbname AND table_name=@tablename AND column_name=@columnname)>0,'SELECT 1',CONCAT('ALTER TABLE ',@tablename,' ADD COLUMN upi_qr_image VARCHAR(1000) NULL')));
PREPARE addColumn FROM @preparedStatement; EXECUTE addColumn; DEALLOCATE PREPARE addColumn;
SET @columnname = 'payment_instructions';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema=@dbname AND table_name=@tablename AND column_name=@columnname)>0,'SELECT 1',CONCAT('ALTER TABLE ',@tablename,' ADD COLUMN payment_instructions VARCHAR(500) NOT NULL DEFAULT ''Pay the requested amount by UPI. We will start after confirming it.''')));
PREPARE addColumn FROM @preparedStatement; EXECUTE addColumn; DEALLOCATE PREPARE addColumn;

SET @tablename = 'custom_requests';
SET @columnname = 'user_id';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema=@dbname AND table_name=@tablename AND column_name=@columnname)>0,'SELECT 1',CONCAT('ALTER TABLE ',@tablename,' ADD COLUMN user_id VARCHAR(80) NULL')));
PREPARE addColumn FROM @preparedStatement; EXECUTE addColumn; DEALLOCATE PREPARE addColumn;
SET @columnname = 'user_idx';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE table_schema=@dbname AND table_name=@tablename AND index_name=@columnname)>0,'SELECT 1',CONCAT('ALTER TABLE ',@tablename,' ADD INDEX user_idx (user_id)')));
PREPARE addIndex FROM @preparedStatement; EXECUTE addIndex; DEALLOCATE PREPARE addIndex;
SET @columnname = 'pickup_location';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema=@dbname AND table_name=@tablename AND column_name=@columnname)>0,'SELECT 1',CONCAT('ALTER TABLE ',@tablename,' ADD COLUMN pickup_location VARCHAR(240) NULL')));
PREPARE addColumn FROM @preparedStatement; EXECUTE addColumn; DEALLOCATE PREPARE addColumn;

CREATE TABLE IF NOT EXISTS payment_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(40) NOT NULL,
  amount INT UNSIGNED NOT NULL,
  method VARCHAR(40) NOT NULL DEFAULT 'UPI',
  reference VARCHAR(120) NOT NULL DEFAULT '',
  note VARCHAR(500) NOT NULL DEFAULT '',
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(180) NOT NULL DEFAULT 'admin',
  CONSTRAINT fk_payment_records_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_payment_records_order (order_id)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_type VARCHAR(20) NOT NULL,
  entity_id VARCHAR(40) NOT NULL,
  user_id VARCHAR(80) NOT NULL,
  sender_role VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation_entity (conversation_type, entity_id, created_at),
  INDEX idx_conversation_user (user_id)
);
