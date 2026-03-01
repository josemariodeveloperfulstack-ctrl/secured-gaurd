-- V300: Adiciona campo numero_rg (Identidade) na tabela employees
-- Campo faltante identificado na planilha de importação de funcionários

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS numero_rg VARCHAR(30);
