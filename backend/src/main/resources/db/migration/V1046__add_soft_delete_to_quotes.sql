ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES users(id);

UPDATE quotes SET is_deleted = false WHERE is_deleted IS NULL;
