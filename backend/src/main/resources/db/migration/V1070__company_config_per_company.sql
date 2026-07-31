-- Permite uma configuração de layout/contrato por empresa (company_id).
-- Remove a regra implícita de "apenas uma config ativa global".

CREATE INDEX IF NOT EXISTS idx_company_configs_company_id
    ON company_configs (company_id);

-- Mantém as configs existentes ativas por empresa (não desativa outras empresas).
UPDATE company_configs
SET active = true
WHERE company_id IS NOT NULL
  AND active IS DISTINCT FROM true;
