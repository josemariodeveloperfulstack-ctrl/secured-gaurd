-- =============================================================
-- Script: Limpar work_post_id órfãos na tabela employees
-- Descrição: Remove referências a postos de trabalho que não 
--            existem mais na tabela work_posts.
-- ATENÇÃO: Execute primeiro o SELECT para ver os afetados,
--          depois execute o UPDATE para corrigir.
-- =============================================================

-- 1. DIAGNÓSTICO: Ver quais funcionários têm work_post_id apontando para postos inexistentes
SELECT 
    e.id AS employee_id,
    e.name AS employee_name,
    e.work_post_id,
    wp.name AS work_post_name
FROM employees e
LEFT JOIN work_posts wp ON e.work_post_id = wp.id
WHERE e.work_post_id IS NOT NULL
  AND wp.id IS NULL;

-- 2. CORREÇÃO: Limpar os work_post_id órfãos (o posto foi excluído)
-- Descomente a linha abaixo para executar a correção:
-- UPDATE employees SET work_post_id = NULL WHERE work_post_id IS NOT NULL AND work_post_id NOT IN (SELECT id FROM work_posts);
