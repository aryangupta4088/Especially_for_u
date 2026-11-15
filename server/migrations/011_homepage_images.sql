-- Store replaceable homepage and custom-request page image URLs.
SET @dbname = DATABASE();
SET @tablename = 'site_settings';
SET @columnname = 'homepage_images_json';
SET @preparedStatement = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE table_schema = @dbname AND table_name = @tablename AND column_name = @columnname) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' JSON NULL')
  )
);
PREPARE addHomepageImages FROM @preparedStatement;
EXECUTE addHomepageImages;
DEALLOCATE PREPARE addHomepageImages;
