-- =====================================================
-- SCRIPT PARA EXPORTAR POSTOS DE TRABALHO DO BANCO secured_guard_test
-- Execute este script no PostgreSQL conectado ao banco secured_guard_test
-- e copie os INSERTs gerados para o arquivo V999__seed_ci_essential_data.sql
-- =====================================================

-- Gerar INSERTs completos para a tabela work_posts
SELECT 
    'INSERT INTO work_posts (' ||
    'id, post_code, name, description, type, status, address, client_id, ' ||
    'required_vigilantes, work_schedule, shift_start, shift_end, ' ||
    'created_at, updated_at' ||
    ') VALUES (' ||
    '''' || id || ''', ' ||
    '''' || REPLACE(post_code, '''', '''''') || ''', ' ||
    '''' || REPLACE(name, '''', '''''') || ''', ' ||
    COALESCE('''' || REPLACE(description, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || type || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(status, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(address, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || client_id || '''', 'NULL') || ', ' ||
    COALESCE(required_vigilantes::text, '0') || ', ' ||
    COALESCE('''' || REPLACE(work_schedule, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || shift_start::text || '''', 'NULL') || ', ' ||
    COALESCE('''' || shift_end::text || '''', 'NULL') || ', ' ||
    COALESCE('''' || created_at::text || '''', 'NOW()') || ', ' ||
    COALESCE('''' || updated_at::text || '''', 'NOW()') ||
    ') ON CONFLICT (id) DO NOTHING;' as insert_statement
FROM work_posts
ORDER BY name;
