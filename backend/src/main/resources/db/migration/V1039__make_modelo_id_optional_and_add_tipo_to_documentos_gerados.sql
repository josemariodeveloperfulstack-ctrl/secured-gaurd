-- V1039: Tornar modelo_id opcional em documentos_gerados e adicionar coluna tipo
--
-- Motivação: alguns documentos do sistema (Contrato de Trabalho, Termos, OS, NPPS,
-- Declarações, etc.) são gerados a partir de templates fixos em código, e não de
-- um ModeloDocumento dinâmico. Para passar a persisti-los em `documentos_gerados`
-- (para download posterior por RH e Colaborador), `modelo_id` precisa ser opcional.
--
-- A coluna `tipo` categoriza esses documentos quando não há modelo associado.

-- 1) Tornar modelo_id opcional
ALTER TABLE documentos_gerados
    ALTER COLUMN modelo_id DROP NOT NULL;

-- 2) Adicionar coluna tipo (categoria de documento gerado pelo sistema)
ALTER TABLE documentos_gerados
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(60);

-- 3) Índice para filtragem por tipo
CREATE INDEX IF NOT EXISTS idx_documentos_gerados_tipo
    ON documentos_gerados(tipo);

-- 4) Comentário
COMMENT ON COLUMN documentos_gerados.tipo IS
    'Categoria do documento gerado pelo sistema (ex: EMPLOYMENT_CONTRACT, DECLARATION, LGPD_CONSENT, TRANSPORT_VOUCHER, DISCIPLINARY_WARNING, EQUIPMENT_RESPONSIBILITY, SERVICE_PROVIDER_AWARENESS, SERVICE_ORDER, NPPS, ACTIVITY_REPORT, EPI_DELIVERY). NULL para documentos gerados a partir de ModeloDocumento dinâmico.';
