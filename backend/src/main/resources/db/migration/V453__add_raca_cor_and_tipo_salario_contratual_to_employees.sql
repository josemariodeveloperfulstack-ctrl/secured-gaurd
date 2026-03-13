-- Adicionar colunas Raça/Cor e Tipo Sal. Contratual para importação de planilha eSocial
-- Raça/Cor: classificação IBGE (BRANCA, PRETA, PARDA, AMARELA, INDIGENA, NAO_INFORMADO)
-- Tipo Sal. Contratual: tipo de salário contratual (MENSAL, HORISTA, etc.)

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS raca_cor VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tipo_salario_contratual VARCHAR(50);

COMMENT ON COLUMN employees.raca_cor IS 'Raça/Cor do funcionário (classificação IBGE/eSocial)';
COMMENT ON COLUMN employees.tipo_salario_contratual IS 'Tipo de salário contratual (MENSAL, HORISTA, etc.)';
