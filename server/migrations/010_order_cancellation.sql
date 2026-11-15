-- Migration 010: allow admins to close customer cancellation per order.
SET @dbname = DATABASE();
SET @tablename = 'orders';
SET @columnname = 'cancellation_allowed';
SET @preparedStatement = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE table_schema = @dbname AND table_name = @tablename AND column_name = @columnname) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' BOOLEAN NOT NULL DEFAULT TRUE')
  )
);
PREPARE addCancellationAllowed FROM @preparedStatement;
EXECUTE addCancellationAllowed;
DEALLOCATE PREPARE addCancellationAllowed;
