-- Adicionar campo opcional de foto ao termo de acautelamento de armas
ALTER TABLE firearm_acautelamentos ADD COLUMN IF NOT EXISTS photo_base64 TEXT;
