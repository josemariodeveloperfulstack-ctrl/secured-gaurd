-- =====================================================
-- SEED DE DADOS ESSENCIAIS PARA AMBIENTE CI
-- Executado automaticamente via Flyway após migrations
-- =====================================================

-- Hash BCrypt para senha "Admin123!" (senha padrão para CI)
-- Gerado com BCryptPasswordEncoder (10 rounds)
-- Senha: Admin123!
-- Hash: $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDa

-- =====================================================
-- 1. USUÁRIO ADMINISTRADOR CI
-- =====================================================
INSERT INTO users (id, username, password, email, name, role, status, active, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'admin@ci',
    '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDa',
    'admin@ci.z7botsolutions.com.br',
    'Administrador CI',
    'ADMIN',
    'ACTIVE',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. UNIDADE MATRIZ CI
-- =====================================================
INSERT INTO units (id, name, description, address, phone, email, created_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Unidade Matriz CI',
    'Unidade matriz para ambiente de CI',
    'Rua CI, 123 - São Paulo, SP',
    '(11) 9999-9999',
    'matriz@ci.z7botsolutions.com.br',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. TURNOS PADRÃO
-- =====================================================
INSERT INTO shifts (id, name, start_time, end_time, created_at, updated_at)
VALUES
    ('33333333-3333-3333-3333-333333333333', 'Manhã', '08:00:00', '16:00:00', NOW(), NOW()),
    ('44444444-4444-4444-4444-444444444444', 'Tarde', '16:00:00', '00:00:00', NOW(), NOW()),
    ('55555555-5555-5555-5555-555555555555', 'Noite', '00:00:00', '08:00:00', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. CARGOS/POSIÇÕES BÁSICAS
-- =====================================================
INSERT INTO positions (id, name, description, unit_id, created_at, updated_at)
VALUES
    (
        '66666666-6666-6666-6666-666666666666',
        'Vigilante',
        'Vigilante de segurança',
        '22222222-2222-2222-2222-222222222222',
        NOW(),
        NOW()
    ),
    (
        '77777777-7777-7777-7777-777777777777',
        'Supervisor',
        'Supervisor de segurança',
        '22222222-2222-2222-2222-222222222222',
        NOW(),
        NOW()
    ),
    (
        '88888888-8888-8888-8888-888888888888',
        'Gerente',
        'Gerente de segurança',
        '22222222-2222-2222-2222-222222222222',
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. DEPARTAMENTO BÁSICO
-- =====================================================
INSERT INTO departments (id, name, description, created_at, updated_at)
VALUES (
    '99999999-9999-9999-9999-999999999999',
    'Operacional',
    'Departamento operacional para CI',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. CLIENTE DE TESTE
-- =====================================================
INSERT INTO clients (id, name, cnpj, email, phone, address, city, state, zip_code, status, created_at, updated_at)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Cliente Teste CI',
    '12.345.678/0001-90',
    'cliente@teste.ci',
    '(11) 3333-3333',
    'Rua Teste, 123',
    'São Paulo',
    'SP',
    '01234-567',
    'ACTIVE',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- LOG DE CONCLUSÃO
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Seed de dados essenciais para CI concluído com sucesso!';
    RAISE NOTICE '   - Usuário admin: admin@ci (senha: Admin123!)';
    RAISE NOTICE '   - Unidade: Unidade Matriz CI';
    RAISE NOTICE '   - Turnos: Manhã, Tarde, Noite';
    RAISE NOTICE '   - Cargos: Vigilante, Supervisor, Gerente';
    RAISE NOTICE '   - Departamento: Operacional';
    RAISE NOTICE '   - Cliente: Cliente Teste CI';
END $$;
