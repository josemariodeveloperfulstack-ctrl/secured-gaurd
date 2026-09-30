-- Migration to add judicial process tracking fields to employees table
ALTER TABLE employees 
    ADD COLUMN IF NOT EXISTS judicial_process_start_date DATE,
    ADD COLUMN IF NOT EXISTS judicial_process_end_date DATE,
    ADD COLUMN IF NOT EXISTS judicial_process_notes VARCHAR(500);

COMMENT ON COLUMN employees.judicial_process_start_date IS 'Data de início do processo judicial / afastamento sub judice';
COMMENT ON COLUMN employees.judicial_process_end_date IS 'Data de encerramento do processo judicial';
COMMENT ON COLUMN employees.judicial_process_notes IS 'Observações sobre o processo judicial';
