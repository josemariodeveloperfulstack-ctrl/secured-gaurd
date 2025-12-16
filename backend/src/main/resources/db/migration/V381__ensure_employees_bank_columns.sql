-- Garante que a tabela employees tenha todas as colunas bancárias esperadas pelo código Java
-- Especialmente para ambientes onde o schema foi criado de forma incompleta (como o CI)

DO $$
BEGIN
    -- Campos bancários básicos usados pelo modelo Employee
    ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS banco          VARCHAR(100),
        ADD COLUMN IF NOT EXISTS agencia        VARCHAR(20),
        ADD COLUMN IF NOT EXISTS conta_corrente VARCHAR(20);

    RAISE NOTICE 'Colunas bancárias em employees verificadas/atualizadas com sucesso.';
END $$;


