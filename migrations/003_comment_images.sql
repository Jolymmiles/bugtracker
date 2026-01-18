-- Add images array column to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
