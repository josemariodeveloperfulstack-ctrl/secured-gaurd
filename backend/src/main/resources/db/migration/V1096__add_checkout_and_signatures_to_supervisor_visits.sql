-- V1096: Adicionar colunas de finalização de visita (check-out, atas, assinaturas e EPI)
ALTER TABLE supervisor_visits
ADD COLUMN IF NOT EXISTS checkout_time TIME,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS signature_data TEXT,
ADD COLUMN IF NOT EXISTS epi_delivered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS epi_description TEXT,
ADD COLUMN IF NOT EXISTS epi_signature_data TEXT;
