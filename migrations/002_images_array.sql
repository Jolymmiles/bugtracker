-- Add images array column to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Migrate existing image_url to images array
UPDATE cards SET images = ARRAY[image_url] WHERE image_url IS NOT NULL AND image_url != '' AND (images IS NULL OR images = '{}');
