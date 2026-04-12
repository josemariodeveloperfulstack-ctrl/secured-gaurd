-- Snapshot do setor/posto/cargo do funcionário no momento da requisição (auditoria)
ALTER TABLE stock_requisitions
    ADD COLUMN IF NOT EXISTS employee_work_sector VARCHAR(500);

COMMENT ON COLUMN stock_requisitions.employee_work_sector IS 'Snapshot textual: departamento, posto e cargo do solicitante na criação da requisição';
