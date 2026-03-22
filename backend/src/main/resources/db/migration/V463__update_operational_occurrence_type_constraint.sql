-- Migration V462: Update check constraint for OperationalOccurrence types
-- Adds support for new types introduced in the entity

-- 1. Remove old constraint
ALTER TABLE operational_occurrences DROP CONSTRAINT IF EXISTS chk_operational_occurrence_type;

-- 2. Add new constraint with all current enum values
ALTER TABLE operational_occurrences ADD CONSTRAINT chk_operational_occurrence_type 
    CHECK (type IN (
        'SEGURANCA', 
        'DISCIPLINAR', 
        'EQUIPAMENTO', 
        'INCIDENTE', 
        'MANUTENCAO',
        'FALTA', 
        'TROCA', 
        'HE', 
        'FREE_LANCE', 
        'PEDIDO_DEMISSAO', 
        'FALTA_EFETIVO', 
        'SOLICITACAO_CLIENTE', 
        'OUTROS'
    ));

-- 3. Ensure priority and status constraints are also up to date (idempotent)
ALTER TABLE operational_occurrences DROP CONSTRAINT IF EXISTS chk_operational_occurrence_status;
ALTER TABLE operational_occurrences ADD CONSTRAINT chk_operational_occurrence_status 
    CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'RESOLVIDO', 'CONCLUIDO'));

ALTER TABLE operational_occurrences DROP CONSTRAINT IF EXISTS chk_operational_occurrence_priority;
ALTER TABLE operational_occurrences ADD CONSTRAINT chk_operational_occurrence_priority 
    CHECK (priority IN ('BAIXA', 'MEDIA', 'ALTA'));
