-- Migration: V419__translate_permissions.sql
-- Description: Translate remaining English permissions to Portuguese

-- Fix "Assign Equipments"
UPDATE permissions SET description = 'Atribuir Equipamentos' WHERE description = 'Assign Equipments' OR name = 'EQUIPMENTS_ASSIGN';

-- Fix "Criar Absences" -> "Criar Ausências"
UPDATE permissions SET description = 'Criar Ausências' WHERE description LIKE '%Absences%' OR name = 'ABSENCES_CREATE';

-- Fix "Criar Bank Reconciliation" -> "Criar Reconciliação Bancária"
UPDATE permissions SET description = 'Criar Reconciliação Bancária' WHERE description LIKE '%Bank Reconciliation%' OR name = 'BANK_RECONCILIATION_CREATE';

-- Fix "Criar Candidates" -> "Criar Candidatos"
UPDATE permissions SET description = 'Criar Candidatos' WHERE description LIKE '%Candidates%' OR name = 'CANDIDATES_CREATE';

-- Fix "Criar Benefits" -> "Criar Benefícios"
UPDATE permissions SET description = 'Criar Benefícios' WHERE description LIKE '%Benefits%' OR name = 'BENEFITS_CREATE';

-- Fix "Criar Certifications" -> "Criar Certificações"
UPDATE permissions SET description = 'Criar Certificações' WHERE description LIKE '%Certifications%' OR name = 'CERTIFICATIONS_CREATE';

-- Fix "Criar Companies" -> "Criar Empresas"
UPDATE permissions SET description = 'Criar Empresas' WHERE description LIKE '%Companies%' OR name = 'COMPANIES_CREATE';

-- Fix "Criar Activity Reports" -> "Criar Relatórios de Atividade"
UPDATE permissions SET description = 'Criar Relatórios de Atividade' WHERE description LIKE '%Activity Reports%' OR name = 'ACTIVITY_REPORTS_CREATE';

-- Generic "Update" -> "Atualizar" fixes
UPDATE permissions SET description = REPLACE(description, 'Update', 'Atualizar') WHERE description LIKE 'Update%';
UPDATE permissions SET description = REPLACE(description, 'Create', 'Criar') WHERE description LIKE 'Create%';
UPDATE permissions SET description = REPLACE(description, 'Delete', 'Excluir') WHERE description LIKE 'Delete%';
UPDATE permissions SET description = REPLACE(description, 'View', 'Visualizar') WHERE description LIKE 'View%';

-- Specific fixes for the screenshot items
UPDATE permissions SET description = 'Atualizar orçamentos' WHERE description = 'Update quotes' OR name = 'QUOTES_UPDATE';
UPDATE permissions SET description = 'Atualizar propostas' WHERE description = 'Update proposals' OR name = 'PROPOSALS_UPDATE';
UPDATE permissions SET description = 'Atualizar leads' WHERE description = 'Update leads' OR name = 'LEADS_UPDATE';

-- Fix "Baixar holerite" (seems redundant but checking)
UPDATE permissions SET description = 'Baixar holerite' WHERE name = 'PAYSLIPS_DOWNLOAD' OR description = 'Download payslip';
