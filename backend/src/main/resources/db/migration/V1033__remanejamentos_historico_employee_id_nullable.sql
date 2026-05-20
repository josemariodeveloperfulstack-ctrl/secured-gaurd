-- Permite registos de auditoria (ex.: EXCLUSAO) quando o remanejamento não tem
-- funcionário resolvível (legado, FK quebrada ou @NotFound IGNORE → employee null).
DO $$
DECLARE
    cname text;
BEGIN
    SELECT tc.constraint_name
    INTO cname
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_schema = kcu.constraint_schema
       AND tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = current_schema()
      AND tc.table_name = 'remanejamentos_historico'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'employee_id'
    LIMIT 1;

    IF cname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE remanejamentos_historico DROP CONSTRAINT %I', cname);
    END IF;
END $$;

ALTER TABLE remanejamentos_historico
    ALTER COLUMN employee_id DROP NOT NULL;

-- Referências órfãs (employee apagado ou dados legados) fazem falhar o ADD CONSTRAINT (23503).
UPDATE remanejamentos_historico h
SET employee_id = NULL
WHERE h.employee_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = h.employee_id);

ALTER TABLE remanejamentos_historico
    ADD CONSTRAINT fk_remanejamentos_historico_employee
    FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE SET NULL;

COMMENT ON COLUMN remanejamentos_historico.employee_id IS
    'Funcionário associado ao evento; NULL quando o remanejamento não tinha funcionário resolvível (auditoria de exclusão).';
