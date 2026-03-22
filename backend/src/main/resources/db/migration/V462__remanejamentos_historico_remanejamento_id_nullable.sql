-- Permite NULL em remanejamento_id para o fluxo de exclusão:
-- RemanejamentoService nullifica a FK nos registros de histórico antes de apagar o remanejamento.
-- A tabela foi criada com NOT NULL (V61), o que causava DataIntegrityViolation / 409.

ALTER TABLE remanejamentos_historico
    ALTER COLUMN remanejamento_id DROP NOT NULL;
