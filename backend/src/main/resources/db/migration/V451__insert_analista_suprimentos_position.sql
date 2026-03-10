-- Migration: V451__insert_analista_suprimentos_position.sql
-- Inserir o cargo de Analista de Suprimentos na tabela positions
-- Este cargo terá as mesmas permissões que o Assistente Administrativo e acesso a Holerites

INSERT INTO positions (id, name, description, cbo, base_salary, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'Analista de Suprimentos',
    'Cargo com foco em gestão de suprimentos, compras e estoque, com acesso a processamento de holerites.',
    '2521-05', -- CBO aproximado para Administrador de suprimentos
    0.00, -- Salário base a ser definido na contratação
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM positions p WHERE p.name = 'Analista de Suprimentos'
);
