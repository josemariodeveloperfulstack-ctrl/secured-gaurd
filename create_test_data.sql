-- Script simplificado para inserir dados de teste básicos
-- Execute este script no DBeaver ou pgAdmin

-- 1. Inserir cliente básico
INSERT INTO clients (id, name, cnpj, email, phone, address, city, state, zip_code, status, created_at, updated_at) 
VALUES (gen_random_uuid(), 'Cliente Teste ABC', '12.345.678/0001-90', 'teste@abc.com', '(11) 3333-3333', 'Rua das Flores, 123', 'São Paulo', 'SP', '01234-567', 'ACTIVE', NOW(), NOW())
ON CONFLICT (cnpj) DO NOTHING;

-- 2. Inserir funcionários básicos (sem dependências complexas)
INSERT INTO employees (id, name, cpf, rg, birth_date, address, phone, email, hire_date, status, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'João Silva', '123.456.789-01', '12.345.678-9', '1985-03-15', 'Rua A, 100', '(11) 99999-9999', 'joao@teste.com', '2024-01-15', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'Maria Santos', '987.654.321-09', '98.765.432-1', '1990-07-22', 'Av. B, 200', '(11) 88888-8888', 'maria@teste.com', '2023-08-10', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'Pedro Costa', '456.789.123-45', '45.678.912-3', '1988-12-10', 'Rua C, 300', '(11) 77777-7777', 'pedro@teste.com', '2024-02-01', 'ACTIVE', NOW(), NOW())
ON CONFLICT (cpf) DO NOTHING;

-- 3. Inserir postos básicos
INSERT INTO work_posts (id, post_code, name, description, type, status, address, city, state, zip_code, client_id, required_vigilantes, work_schedule, shift_start, shift_end, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'POST-001',
    'Posto Shopping Center',
    'Posto de segurança no shopping',
    'POSTO_24H',
    'ATIVO',
    'Av. Paulista, 1000',
    'São Paulo',
    'SP',
    '01310-100',
    c.id,
    3,
    '24 horas',
    '00:00:00',
    '23:59:59',
    NOW(),
    NOW()
FROM clients c WHERE c.name = 'Cliente Teste ABC'

UNION ALL

SELECT 
    gen_random_uuid(),
    'POST-002',
    'Posto Banco Central',
    'Posto de segurança bancário',
    'POSTO_12H_DIURNO',
    'ATIVO',
    'Rua Augusta, 500',
    'São Paulo',
    'SP',
    '01305-000',
    c.id,
    2,
    '12h diurno',
    '06:00:00',
    '18:00:00',
    NOW(),
    NOW()
FROM clients c WHERE c.name = 'Cliente Teste ABC';

-- Verificar dados inseridos
SELECT 'Clientes:' as tipo, COUNT(*) as total FROM clients
UNION ALL
SELECT 'Funcionários:', COUNT(*) FROM employees  
UNION ALL
SELECT 'Postos:', COUNT(*) FROM work_posts;
