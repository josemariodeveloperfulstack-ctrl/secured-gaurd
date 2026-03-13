-- Adicionar coluna U.F RG (estado de emissão do documento RG) para alinhamento com planilha
-- Coluna R da planilha: U.F RG

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS rg_uf VARCHAR(2);

COMMENT ON COLUMN employees.rg_uf IS 'UF de emissão do documento RG (estado)';
