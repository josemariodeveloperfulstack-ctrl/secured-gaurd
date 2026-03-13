-- =============================================================================
-- Script para LIMPAR a tabela employees e todas as dependências
-- Use quando precisar importar novos dados do zero
--
-- ATENÇÃO: Este script APAGA TODOS os funcionários e dados relacionados!
-- Faça backup antes se necessário.
--
-- Como executar (PostgreSQL):
--   psql -h localhost -U seu_usuario -d secured_guard -f scripts/truncate-employees.sql
--
-- Ou via DBeaver/pgAdmin: copie e execute o conteúdo
-- =============================================================================

-- TRUNCATE CASCADE: limpa employees e TODAS as tabelas que referenciam employees
-- O PostgreSQL automaticamente identifica e limpa: dependents, employee_certifications,
-- documents, benefits, payrolls, time_records, work_schedules, etc.
TRUNCATE TABLE employees CASCADE;

-- Confirmação
SELECT 'Tabela employees e dependências limpas com sucesso. Pronto para importar novos dados.' AS resultado;
