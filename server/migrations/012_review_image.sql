-- Store one optional customer photo with each product review.
SET @dbname = DATABASE();
SET @tablename = 'product_reviews';
SET @columnname = 'image_url';
SET @preparedStatement = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE table_schema = @dbname AND table_name = @tablename AND column_name = @columnname) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(1000) NULL')
  )
);
PREPARE addReviewImage FROM @preparedStatement;
EXECUTE addReviewImage;
DEALLOCATE PREPARE addReviewImage;
