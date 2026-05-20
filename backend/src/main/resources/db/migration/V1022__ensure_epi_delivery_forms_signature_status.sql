-- Alinha epi_delivery_forms com EPIDeliveryForm.java ( Hibernate ).
-- Usa IF NOT EXISTS nativo do PostgreSQL para ambientes em que V1021 não foi aplicada ou falhou.

ALTER TABLE epi_delivery_forms ADD COLUMN IF NOT EXISTS signature_base64 TEXT;
ALTER TABLE epi_delivery_forms ADD COLUMN IF NOT EXISTS signature_type VARCHAR(50) DEFAULT 'ON_SCREEN';
ALTER TABLE epi_delivery_forms ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'DRAFT';
ALTER TABLE epi_delivery_forms ADD COLUMN IF NOT EXISTS stock_requisition_id UUID;

UPDATE epi_delivery_forms SET signature_type = 'ON_SCREEN' WHERE signature_type IS NULL;
UPDATE epi_delivery_forms SET status = 'DRAFT' WHERE status IS NULL;
