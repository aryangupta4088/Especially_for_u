-- Migration 005: Add estimated_date, pickup_date, pickup_location columns safely

SET @dbname = DATABASE();

-- Add estimated_date column to orders (admin sets this for Track Your Order)
SET @tablename = 'orders';
SET @columnname = 'estimated_date';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_schema = @dbname)
      AND (table_name = @tablename)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DATE NULL AFTER status')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add pickup_date column to orders (user sets this at checkout)
SET @columnname = 'pickup_date';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_schema = @dbname)
      AND (table_name = @tablename)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DATE NULL AFTER estimated_date')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Make sure location columns are VARCHAR (safe no-op if they already are)
-- delivery_area is already VARCHAR(180) from initial schema
-- location_text is already VARCHAR(240) from initial schema
-- handover_spot is already VARCHAR(120) from initial schema
-- These are already VARCHAR types so no migration needed for ENUM -> VARCHAR conversion
