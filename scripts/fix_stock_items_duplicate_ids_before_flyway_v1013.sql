-- Uso emergencial na VPS se a imagem Docker ainda tiver V1013 antiga (sem DELETE de duplicatas).
-- A migração V1013 falhou e fez rollback: a PK em stock_items ainda não existe.
--
-- Passos:
-- 1) Ajustar usuário/host/porta conforme o ambiente (CI ou PROD).
-- 2) Executar este script no Postgres.
-- 3) Remover a linha falha do Flyway para a V1013 reaplicar o restante do ficheiro:
--    DELETE FROM flyway_schema_history WHERE version = '1013' AND success = false;
-- 4) Reiniciar o backend (Flyway corre V1013 outra vez; o bloco DO ignora se a PK já existir).
--
-- Exemplo CI (docker):
--   docker exec -i secured-guard-db-ci psql -U secured_guard_ci -d secured_guard_ci < scripts/fix_stock_items_duplicate_ids_before_flyway_v1013.sql

-- Remove linhas duplicadas em stock_items (mesmo UUID em mais de uma linha; mantém ctid menor).
DELETE FROM stock_items si
WHERE EXISTS (
    SELECT 1
    FROM stock_items other
    WHERE other.id = si.id AND other.ctid < si.ctid
);

-- Cria PK só se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint co
        JOIN pg_class cl ON cl.oid = co.conrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        WHERE n.nspname = 'public'
          AND cl.relname = 'stock_items'
          AND co.contype = 'p'
    ) THEN
        ALTER TABLE stock_items ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Ainda há ids duplicados em stock_items após DELETE; inspecionar manualmente.';
END $$;
