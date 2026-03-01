-- Migration to add missing bank and pix fields to employees
ALTER TABLE employees ADD COLUMN conta_digito VARCHAR(10);
ALTER TABLE employees ADD COLUMN pix_key VARCHAR(255);
