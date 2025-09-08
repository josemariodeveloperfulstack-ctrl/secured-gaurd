-- Criar funcionários de teste usando dados mínimos necessários

-- Primeiro, vamos verificar se há posições disponíveis, se não, criar uma
INSERT INTO positions (id, name, description, unit_id, created_at, updated_at)
SELECT 
    gen_random_uuid(), 
    'Vigilante', 
    'Vigilante de segurança', 
    u.id, 
    NOW(), 
    NOW()
FROM units u WHERE u.name = 'Matriz'
AND NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Vigilante');

-- Criar funcionários usando o usuário existente e a posição criada
INSERT INTO employees (id, user_id, position_id, registration_number, name, cpf, rg, birth_date, hire_date, status, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    u.id,
    p.id,
    'EMP001',
    'João Silva',
    '12345678901',
    '123456789',
    '1985-03-15',
    '2024-01-15',
    'ACTIVE',
    NOW(),
    NOW()
FROM users u, positions p 
WHERE u.name = 'José Mário Ramos' AND p.name = 'Vigilante'
AND NOT EXISTS (SELECT 1 FROM employees WHERE cpf = '12345678901');

INSERT INTO employees (id, user_id, position_id, registration_number, name, cpf, rg, birth_date, hire_date, status, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    u.id,
    p.id,
    'EMP002',
    'Maria Santos',
    '98765432109',
    '987654321',
    '1990-07-22',
    '2023-08-10',
    'ACTIVE',
    NOW(),
    NOW()
FROM users u, positions p 
WHERE u.name = 'José Mário Ramos' AND p.name = 'Vigilante'
AND NOT EXISTS (SELECT 1 FROM employees WHERE cpf = '98765432109');

INSERT INTO employees (id, user_id, position_id, registration_number, name, cpf, rg, birth_date, hire_date, status, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    u.id,
    p.id,
    'EMP003',
    'Pedro Oliveira',
    '11122233344',
    '111222333',
    '1988-12-05',
    '2023-05-20',
    'ACTIVE',
    NOW(),
    NOW()
FROM users u, positions p 
WHERE u.name = 'José Mário Ramos' AND p.name = 'Vigilante'
AND NOT EXISTS (SELECT 1 FROM employees WHERE cpf = '11122233344');

-- Verificar se os dados foram inseridos
SELECT 'Funcionários de teste criados!' as status;
SELECT id, name, cpf FROM employees;