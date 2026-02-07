-- Adicionar company_id em company_configs para vincular à tabela Companies
-- Cabeçalho e rodapé do PDF passam a vir da tabela companies

ALTER TABLE company_configs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_company_configs_company_id ON company_configs(company_id);

-- Vincular configs existentes à empresa pelo CNPJ
UPDATE company_configs cc
SET company_id = c.id
FROM companies c
WHERE cc.company_id IS NULL
  AND REPLACE(REPLACE(REPLACE(REPLACE(c.cnpj, '.', ''), '/', ''), '-', ''), ' ', '') 
   = REPLACE(REPLACE(REPLACE(REPLACE(cc.cnpj, '.', ''), '/', ''), '-', ''), ' ', '');
