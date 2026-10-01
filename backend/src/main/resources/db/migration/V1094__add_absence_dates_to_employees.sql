-- Migration to add INSS and absence start and end dates to employees table
ALTER TABLE employees 
    ADD COLUMN IF NOT EXISTS inss_start_date DATE,
    ADD COLUMN IF NOT EXISTS inss_end_date DATE,
    ADD COLUMN IF NOT EXISTS absence_start_date DATE,
    ADD COLUMN IF NOT EXISTS absence_end_date DATE;

COMMENT ON COLUMN employees.inss_start_date IS 'Data de início do afastamento por INSS';
COMMENT ON COLUMN employees.inss_end_date IS 'Data de término do afastamento por INSS';
COMMENT ON COLUMN employees.absence_start_date IS 'Data de início do afastamento do funcionário';
COMMENT ON COLUMN employees.absence_end_date IS 'Data de término do afastamento do funcionário';
