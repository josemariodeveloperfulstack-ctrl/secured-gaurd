-- =====================================================
-- SEED DE DADOS ESSENCIAIS PARA AMBIENTE CI
-- Executado automaticamente via Flyway após migrations
-- =====================================================

-- Hash BCrypt para senha "Admin123!" (senha padrão para CI)
-- Gerado com BCryptPasswordEncoder (10 rounds)
-- Senha: Admin123!
-- Hash: $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDa

-- 1. USUÁRIO ADMINISTRADOR CI
-- =====================================================
DO $$
BEGIN
    -- Garantir que os roles essenciais existam no ambiente CI
    INSERT INTO roles (id, name, description)
    SELECT gen_random_uuid(), 'SUPER_ADMIN', 'Super Administrador com acesso total ao sistema (CI)'
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'SUPER_ADMIN');

    INSERT INTO roles (id, name, description)
    SELECT gen_random_uuid(), 'COLABORADOR', 'Colaborador padrão do sistema (CI)'
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'COLABORADOR');

    -- Ambiente legado: tabela users ainda possui coluna "role" (NOT NULL)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'role'
    ) THEN
        INSERT INTO users (id, username, password, email, name, role, status, active, created_at, updated_at)
        SELECT 
            '11111111-1111-1111-1111-111111111111'::uuid,
            'admin@ci',
            '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDa',
            'admin@ci.z7botsolutions.com.br',
            'Administrador CI',
            'ADMIN',
            'ACTIVE',
            true,
            NOW(),
            NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE id = '11111111-1111-1111-1111-111111111111'::uuid
        );
    ELSE
        -- Esquema novo: coluna "role" já foi removida e usamos relacionamentos JPA (roles / user_roles)
        INSERT INTO users (id, username, password, email, name, status, active, created_at, updated_at)
        SELECT 
            '11111111-1111-1111-1111-111111111111'::uuid,
            'admin@ci',
            '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDa',
            'admin@ci.z7botsolutions.com.br',
            'Administrador CI',
            'ACTIVE',
            true,
            NOW(),
            NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE id = '11111111-1111-1111-1111-111111111111'::uuid
        );
    END IF;
END $$;

-- Atribuir role ADMIN ao usuário admin@ci
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT 
    '11111111-1111-1111-1111-111111111111'::uuid,
    r.id,
    NOW()
FROM roles r
WHERE r.name = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = '11111111-1111-1111-1111-111111111111'::uuid 
        AND ur.role_id = r.id
  );

-- =====================================================
-- 2. UNIDADE MATRIZ CI
-- =====================================================
INSERT INTO units (id, name, description, address, phone, email, created_at, updated_at)
SELECT 
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Unidade Matriz CI',
    'Unidade matriz para ambiente de CI',
    'Rua CI, 123 - São Paulo, SP',
    '(11) 9999-9999',
    'matriz@ci.z7botsolutions.com.br',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM units WHERE id = '22222222-2222-2222-2222-222222222222'::uuid
);

-- =====================================================
-- 3. TURNOS PADRÃO
-- =====================================================
INSERT INTO shifts (id, name, start_time, end_time, created_at, updated_at)
SELECT '33333333-3333-3333-3333-333333333333'::uuid, 'Manhã', '08:00:00'::time, '16:00:00'::time, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM shifts WHERE id = '33333333-3333-3333-3333-333333333333'::uuid)
UNION ALL
SELECT '44444444-4444-4444-4444-444444444444'::uuid, 'Tarde', '16:00:00'::time, '00:00:00'::time, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM shifts WHERE id = '44444444-4444-4444-4444-444444444444'::uuid)
UNION ALL
SELECT '55555555-5555-5555-5555-555555555555'::uuid, 'Noite', '00:00:00'::time, '08:00:00'::time, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM shifts WHERE id = '55555555-5555-5555-5555-555555555555'::uuid);

-- =====================================================
-- 4. CARGOS/POSIÇÕES BÁSICAS
-- =====================================================
INSERT INTO positions (id, name, description, unit_id, created_at, updated_at)
SELECT '66666666-6666-6666-6666-666666666666'::uuid, 'Vigilante', 'Vigilante de segurança', '22222222-2222-2222-2222-222222222222'::uuid, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE id = '66666666-6666-6666-6666-666666666666'::uuid)
UNION ALL
SELECT '77777777-7777-7777-7777-777777777777'::uuid, 'Supervisor', 'Supervisor de segurança', '22222222-2222-2222-2222-222222222222'::uuid, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE id = '77777777-7777-7777-7777-777777777777'::uuid)
UNION ALL
SELECT '88888888-8888-8888-8888-888888888888'::uuid, 'Gerente', 'Gerente de segurança', '22222222-2222-2222-2222-222222222222'::uuid, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE id = '88888888-8888-8888-8888-888888888888'::uuid);

-- =====================================================
-- 5. DEPARTAMENTO BÁSICO
-- =====================================================
-- Garantir que o departamento "Operacional" exista
DO $$
BEGIN
    -- Se não existe, criar
    IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Operacional') THEN
        INSERT INTO departments (id, name, description, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'Operacional',
            'Departamento operacional para CI',
            NOW(),
            NOW()
        );
    ELSE
        -- Se já existe, apenas atualizar descrição
        UPDATE departments 
        SET description = 'Departamento operacional para CI',
            updated_at = NOW()
        WHERE name = 'Operacional';
    END IF;
END $$;

-- =====================================================
-- 6. CLIENTE DE TESTE
-- =====================================================
INSERT INTO clients (id, name, cnpj, email, phone, address, city, state, zip_code, status, created_at, updated_at)
SELECT 
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
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
WHERE NOT EXISTS (
    SELECT 1 FROM clients WHERE cnpj = '12.345.678/0001-90'
);

-- =====================================================
-- 7. EMPRESA DE TESTE
-- =====================================================
INSERT INTO companies (id, name, sigla, cnpj, email, phone, address, city, state, zip_code, status, created_at, updated_at)
SELECT 
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    'Empresa Teste CI',
    'TESTECI',
    '98.765.432/0001-10',
    'empresa@teste.ci',
    '(11) 2222-2222',
    'Av. Empresa, 456',
    'São Paulo',
    'SP',
    '01234-567',
    'ACTIVE',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM companies WHERE cnpj = '98.765.432/0001-10'
);

-- =====================================================
-- 7.1. USUÁRIOS DO BANCO secured_guard_test
-- =====================================================
-- INSERTs hardcoded de usuários exportados do banco secured_guard_test
-- Para gerar estes INSERTs, execute o script: generate_inserts_and_update_migration.ps1
-- no ambiente onde o banco secured_guard_test está disponível

-- COLE OS INSERTs DE USUÁRIOS AQUI:
-- (Execute generate_inserts_and_update_migration.ps1 para gerar automaticamente)

-- =====================================================
-- 7.2. USER_ROLES DOS USUÁRIOS
-- =====================================================
-- INSERTs hardcoded de user_roles exportados do banco secured_guard_test

-- COLE OS INSERTs DE USER_ROLES AQUI:
-- (Execute generate_inserts_and_update_migration.ps1 para gerar automaticamente)

-- =====================================================
-- 8. FUNCIONÁRIOS DO BANCO secured_guard_test
-- =====================================================
-- INSERTs hardcoded de funcionários exportados do banco secured_guard_test
-- Para gerar estes INSERTs, execute o script: generate_inserts_and_update_migration.ps1
-- no ambiente onde o banco secured_guard_test está disponível

-- COLE OS INSERTs DE FUNCIONÁRIOS AQUI:
-- (Execute generate_inserts_and_update_migration.ps1 para gerar automaticamente)

-- =====================================================
-- 8.1. DADOS DA TABELA EMPLOYEES (LEGADO - manter para referência)
-- =====================================================
-- INSTRUÇÕES PARA INCLUIR DADOS REAIS DA TABELA EMPLOYEES:
-- 1. Execute o script: migration-ci/export_all_employees_for_ci.sql no banco de produção/desenvolvimento
-- 2. Copie todos os INSERTs gerados e cole abaixo, substituindo este comentário
-- 3. Os INSERTs já incluem ON CONFLICT (id) DO NOTHING para evitar duplicatas
--
-- Exemplo de estrutura (substitua pelos dados reais exportados):
-- INSERT INTO employees (
--     id, user_id, position_id, registration_number, name, document, cpf, rg, 
--     birth_date, gender, marital_status, nationality, address, phone, email, 
--     unit_id, company_id, hire_date, termination_date, status, notes, photo_url,
--     cnh_number, cnh_expiration_date, cnh_category,
--     ctps, ctps_series, ctps_issue_date, ctps_issuing_agency, ctps_rural,
--     titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
--     carteira_identidade_orgao_emissor, carteira_identidade_data_emissao, certificado_militar,
--     cbo, pis, salario, salario_por_extenso, periodo_pagamento, horario_trabalho, folga_semanal,
--     fgts_optante, fgts_data_opcao, fgts_banco_depositario, fgts_data_retratacao,
--     pis_data_cadastro, pis_banco_depositario, pis_endereco_banco, pis_codigo_banco, pis_codigo_agencia,
--     visto_fiscalizacao, nome_pai, nome_mae, local_nascimento, grau_instrucao,
--     carteira_modelo_19, registro_geral_estrangeiro,
--     casado_brasileiro, nome_conjuge_estrangeiro,
--     spouse_name, spouse_cpf, spouse_rg, spouse_birth_date, spouse_phone, spouse_email,
--     tem_filhos_brasileiros, quantidade_filhos_brasileiros,
--     data_chegada_brasil, naturalizado, decreto_naturalizacao,
--     assinatura_funcionario, data_rescisao,
--     created_at, updated_at
-- ) VALUES (
--     'uuid-aqui', 
--     'user-id-aqui' ou NULL, 
--     'position-id-aqui' ou NULL,
--     'REG001',
--     'Nome do Funcionário',
--     '123.456.789-00',
--     '12.345.678-9',
--     '1990-01-15',
--     'M',
--     'SOLTEIRO',
--     'Brasileiro',
--     'Endereço completo',
--     '(11) 99999-9999',
--     'email@example.com',
--     'unit-id-aqui' ou NULL,
--     'company-id-aqui' ou NULL,
--     '2024-01-01',
--     NULL,
--     'ACTIVE',
--     NULL,
--     NULL,
--     '12345678901',
--     '2025-12-31',
--     'B',
--     ... (outros campos)
--     NOW(),
--     NOW()
-- ) ON CONFLICT (id) DO NOTHING;

-- COLE OS INSERTs EXPORTADOS AQUI ABAIXO:
-- (Execute o script export_all_employees_for_ci.sql no banco de origem e cole os resultados aqui)

-- =====================================================
-- 8.1. FUNCIONÁRIOS DE TESTE (FALLBACK - apenas se não houver dados reais)
-- =====================================================
-- Estes funcionários de teste serão inseridos apenas se não houver conflito
-- com os funcionários reais inseridos acima
INSERT INTO employees (
    id, user_id, position_id, registration_number, name, document, cpf, rg, 
    birth_date, sexo, marital_status, nationality, address, phone, email, 
    unit_id, company_id, hire_date, termination_date, status, notes,
    cnh_number, cnh_expiration_date, cnh_category,
    ctps, ctps_series, ctps_issue_date, ctps_issuing_agency,
    titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
    cbo, pis, salario, periodo_pagamento, horario_trabalho, folga_semanal,
    fgts_optante, fgts_data_opcao, fgts_banco_depositario,
    pis_data_cadastro, pis_banco_depositario,
    nome_pai, nome_mae, local_nascimento, grau_instrucao,
    created_at, updated_at
)
SELECT 
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '66666666-6666-6666-6666-666666666666'::uuid,
    'FUNC001',
    'João Silva',
    '123.456.789-00',
    '123.456.789-00',
    '12.345.678-9',
    '1990-01-15',
    'M',
    'SOLTEIRO',
    'Brasileiro',
    'Rua Funcionário, 789 - São Paulo, SP',
    '(11) 98765-4321',
    'joao.silva@teste.ci',
    '22222222-2222-2222-2222-222222222222'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    '2024-01-01',
    NULL,
    'ACTIVE',
    'Funcionário de teste para ambiente CI',
    '12345678901',
    '2025-12-31',
    'B',
    '1234567890',
    '123',
    '2020-01-15',
    'SSP/SP',
    '123456789012',
    '123',
    '456',
    '5172-10',
    '12345678901',
    2500.00,
    'Mensal',
    '08:00 às 17:00',
    'Domingo',
    true,
    '2024-01-01',
    'Banco do Brasil',
    '2024-01-01',
    'Banco do Brasil',
    'José Silva',
    'Maria Silva',
    'São Paulo, SP',
    'Ensino Médio Completo',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);

INSERT INTO employees (
    id, user_id, position_id, registration_number, name, document, cpf, rg, 
    birth_date, sexo, marital_status, nationality, address, phone, email, 
    unit_id, company_id, hire_date, termination_date, status, notes,
    cnh_number, cnh_expiration_date, cnh_category,
    ctps, ctps_series, ctps_issue_date, ctps_issuing_agency,
    titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
    cbo, pis, salario, periodo_pagamento, horario_trabalho, folga_semanal,
    fgts_optante, fgts_data_opcao, fgts_banco_depositario,
    pis_data_cadastro, pis_banco_depositario,
    nome_pai, nome_mae, local_nascimento, grau_instrucao,
    created_at, updated_at
)
SELECT 
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    NULL,
    '77777777-7777-7777-7777-777777777777'::uuid,
    'FUNC002',
    'Maria Santos',
    '987.654.321-00',
    '987.654.321-00',
    '98.765.432-1',
    '1985-05-20',
    'F',
    'CASADO',
    'Brasileiro',
    'Av. Funcionária, 321 - São Paulo, SP',
    '(11) 91234-5678',
    'maria.santos@teste.ci',
    '22222222-2222-2222-2222-222222222222'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    '2024-02-01',
    NULL,
    'ACTIVE',
    'Funcionária de teste para ambiente CI',
    '98765432109',
    '2026-06-30',
    'AB',
    '9876543210',
    '456',
    '2019-05-20',
    'SSP/SP',
    '987654321098',
    '456',
    '789',
    '5172-10',
    '98765432109',
    3000.00,
    'Mensal',
    '08:00 às 17:00',
    'Sábado',
    true,
    '2024-02-01',
    'Caixa Econômica Federal',
    '2024-02-01',
    'Caixa Econômica Federal',
    'Carlos Santos',
    'Ana Santos',
    'Rio de Janeiro, RJ',
    'Ensino Superior Completo',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid);

-- =====================================================
-- 9. FROTA - VEÍCULOS DE TESTE
-- =====================================================
-- Usar subquery para buscar o ID do departamento "Operacional"
INSERT INTO vehicles (id, plate, model, brand, year, color, status, fuel_type, capacity, current_mileage, department_id, company_id, created_at, updated_at)
SELECT 
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
    'ABC1234',
    'Civic',
    'Honda',
    2020,
    'Prata',
    'ACTIVE',
    'FLEX',
    5,
    45000,
    (SELECT id FROM departments WHERE name = 'Operacional' LIMIT 1),
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate = 'ABC1234')
UNION ALL
SELECT 
    'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
    'DEF5678',
    'Corolla',
    'Toyota',
    2019,
    'Branco',
    'ACTIVE',
    'FLEX',
    5,
    38000,
    (SELECT id FROM departments WHERE name = 'Operacional' LIMIT 1),
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate = 'DEF5678')
UNION ALL
SELECT 
    '11111111-1111-1111-1111-111111111112'::uuid,
    'GHI9012',
    'Hilux',
    'Toyota',
    2021,
    'Prata',
    'ACTIVE',
    'DIESEL',
    5,
    25000,
    (SELECT id FROM departments WHERE name = 'Operacional' LIMIT 1),
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate = 'GHI9012');

-- =====================================================
-- LOG DE CONCLUSÃO
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Seed de dados essenciais para CI concluído com sucesso!';
    RAISE NOTICE '   - Usuário admin: admin@ci (senha: Admin123!)';
    RAISE NOTICE '   - Usuários do banco secured_guard_test: Incluídos via INSERTs hardcoded';
    RAISE NOTICE '   - Unidade: Unidade Matriz CI';
    RAISE NOTICE '   - Turnos: Manhã, Tarde, Noite';
    RAISE NOTICE '   - Cargos: Vigilante, Supervisor, Gerente';
    RAISE NOTICE '   - Departamento: Operacional';
    RAISE NOTICE '   - Cliente: Cliente Teste CI';
    RAISE NOTICE '   - Empresa: Empresa Teste CI';
    RAISE NOTICE '   - Funcionários do banco secured_guard_test: Incluídos via INSERTs hardcoded';
    RAISE NOTICE '   - Funcionários de teste (fallback): 2 funcionários completos';
    RAISE NOTICE '   - Frota: 3 veículos de teste';
END $$;

-- =====================================================
-- 10. CLIENTES REFERENCIADOS PELOS POSTOS DE TRABALHO
-- =====================================================
DO $$
DECLARE
    client_ids uuid[] := ARRAY[
        '07a31427-7e91-4aab-8659-9f08efd933d9', '276c0b0c-bb1f-4107-9aa0-3b93a2e547a2', '7c5e4e3c-4fcb-4111-b0b9-71cb07cfd9e6', 
        '4e52b832-5226-4647-a23f-60fe0877521f', '1319af0a-218e-417c-9205-3258a9f4dced', '02b04d58-c043-47da-9ef0-2f02c5db1e9a', 
        '5f1cb241-be50-434c-930c-51cdb59d2e17', 'f170a64a-560e-4d14-863d-85caedd52646', '65e59abc-db76-410f-8194-a85ad4cc22c7', 
        'ec93e79f-b966-4fb2-9526-78b9cc88eb89', 'eade6ca4-fb2b-4864-8d6e-4c91eea4308e', 'c2a10090-b719-4cf0-8696-a55513a97d7c', 
        'b37c8f45-ff80-4eee-a74d-3e47bf7b6ebe', '6a3cedeb-09bc-4d59-ab8f-ade6b84956d4', '5b642694-8431-4a39-a74b-3f5fccfcf43d', 
        '5d19a2f9-316b-4d00-8ebd-6297363d524d', '89c2ff1a-6e1b-4c36-8c2c-e7d21d91ebbf', 'd637b119-a0aa-4297-99a2-fc226846d25d', 
        '10d89142-fef7-46f7-a366-4a82c3325f50', '63963541-bd1d-415c-af64-c868ff52f033', '63f78ae1-a955-4f61-b719-b6af0fec2a2f', 
        'ddede840-e36a-4e27-8ead-884a955809ed', '9f3671db-c150-4ceb-a69d-2b04b8af46b8', 'fb94f83c-73e0-4277-893f-507f4be05d5f', 
        '2a806237-9548-4dc4-b4ea-2ccfde1671c7', '2fa8aa05-54ec-4bcd-b39c-480b47ae4067', '7424e80e-b1c5-47db-b2af-fb4c4efa2215', 
        '1d9cd74f-00d8-4bd4-b026-d17b12e92eaa', '3b5d0291-aa03-4903-8180-bb093d4fb72d', '5baac85a-9794-427e-81c2-815117d19b2c', 
        'df3ab2d6-d71d-4257-92d0-a30dfb82b043', 'c64e8e02-46d8-4932-986c-a68203126767', '6716064d-ce6f-4263-82da-f3b838eaef5b', 
        '62c88888-7d3b-42d9-af18-6de29c173edb'
    ]::uuid[];
    cid uuid;
BEGIN
    FOREACH cid IN ARRAY client_ids
    LOOP
        INSERT INTO clients (id, name, cnpj, status, created_at, updated_at)
        SELECT cid, 'Cliente Migrado ' || cid, '00.000.000/0001-00', 'ACTIVE', NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM clients WHERE id = cid);
    END LOOP;
END $$;

-- =====================================================
-- 11. POSTOS DE TRABALHO (SEED CI)
-- =====================================================
INSERT INTO public.work_posts (id,post_code,name,description,"type",status,address,city,state,zip_code,client_id,contract_id,responsible_id,required_vigilantes,work_schedule,shift_start,shift_end,shift_description,transport_voucher,cost_allowance,cost_allowance_value,intrajourney,local_meal,meal_ticket,health_plan,dental_plan,cars,motorcycles,radios,corporates,document_bank,pgr,pcmso,implementation_date,implementation_time,observations,created_at,updated_at) VALUES
	 ('88a3df3f-c0c1-43e8-b16a-fe071164c2eb'::uuid,'ASSOCIACAO-ALPHAVILLE-MINAS--001','Associacao Alphaville Minas Gerais','','POSTO_24H','ATIVO','Rodovia MG-010, km 23 - Angicos','Vespasiano ','MG','33206-240','07a31427-7e91-4aab-8659-9f08efd933d9'::uuid,NULL,NULL,1,'12X36','18:00:00','22:00:00','',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-20 18:15:06.021932','2025-10-20 18:15:06.021932'),
	 ('085ed149-e60d-4e87-ac54-7419abf8cd56'::uuid,'CONSTRUTORA-BARBOSA-MELLO-SA-001','CONSTRUTORA BARBOSA MELLO S.A.','','POSTO_24H','ATIVO','Barão de Cocais','Congonhas','MG','35970-000','276c0b0c-bb1f-4107-9aa0-3b93a2e547a2'::uuid,NULL,NULL,1,'12X36','08:00:00','18:00:00','',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-20 18:16:42.187276','2025-10-20 18:16:42.187276'),
	 ('ea46bd73-eec5-4c96-b870-0591cf77d403'::uuid,'CONSTRUTORA-BARBOSA-MELLO-SA-002','CONSTRUTORA BARBOSA MELLO S.A.','','POSTO_24H','ATIVO','Avenida Júlia Kubitschek, 1512 - Centro','Congonhas ','MG','36410-084','7c5e4e3c-4fcb-4111-b0b9-71cb07cfd9e6'::uuid,NULL,NULL,1,'12X36','08:00:00','18:00:00','',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-20 18:18:53.755228','2025-10-20 18:19:04.905749'),
	 ('8f3605e9-e696-4bda-a50f-c187cc6352b4'::uuid,'HARSCO-MINERAIS-001','HARSCO MINERAIS','','POSTO_24H','ATIVO','Rodovia BR-381, s/n - Núcleo Industrial, Timóteo','Timóteo','MG','35180001','4e52b832-5226-4647-a23f-60fe0877521f'::uuid,NULL,NULL,1,'12X36','08:00:00','18:00:00','',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-20 19:01:25.232995','2025-10-20 19:01:39.616698'),
	 ('1cfbb875-4981-46f2-9f90-21eadbf189e4'::uuid,'ALPHAVILLE-001','ALPHAVILLE','','POSTO_24H','ATIVO','RODOVIA MG-010, km23 - Angicos','Vespasiano','MG','33206240','07a31427-7e91-4aab-8659-9f08efd933d9'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 14:15:14.853696','2025-10-21 14:15:14.853696'),
	 ('83114879-7203-4a85-adab-a11594f5e55d'::uuid,'CREDIPEL-SICOOB-001','CREDIPEL SICOOB','Teste','POSTO_24H','ATIVO','Rua Comendador Antônio Alves, 825 ','Pedro Leopoldo','MG','33600000','1319af0a-218e-417c-9205-3258a9f4dced'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','',true,true,150.00,true,true,true,true,true,1,0,2,0,true,true,true,NULL,NULL,'Teste','2025-10-21 14:19:32.275406','2025-10-21 14:19:32.275406'),
	 ('32eb30c8-e855-4b4b-8473-c91344817c88'::uuid,'SICREDI-VESPASIANO-001','SICREDI VESPASIANO','Test','POSTO_24H','ATIVO','Rua Doutor Ary Teixeira, 438 - Centro','Vespasiano','MG','33200338','02b04d58-c043-47da-9ef0-2f02c5db1e9a'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'Teste','2025-10-21 14:21:47.037185','2025-10-21 14:21:47.037185'),
	 ('1ee51c9a-e8ba-41d2-99ab-10a37345aa6d'::uuid,'EPIROC-001','EPIROC','Teste','POSTO_24H','ATIVO','Avenida Helena de Vasconcelos Costa, 1250 - Cinco/ Perobas (Cincaon','Contagem','MG','3237168','5f1cb241-be50-434c-930c-51cdb59d2e17'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'Teste','2025-10-21 14:27:05.36379','2025-10-21 14:27:05.36379'),
	 ('9862bb2c-3f9f-4561-8669-61a537a1bd66'::uuid,'SICREDI-VENDA-NOVA-001','SICREDI VENDA NOVA','','POSTO_24H','ATIVO','Rua Padre Pedro Pinto, 1601, Loja 25, Bloco 01 - Venda Nova','Belo Horizonte','MG','31510000','02b04d58-c043-47da-9ef0-2f02c5db1e9a'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 15:16:20.883153','2025-10-21 15:16:20.883153'),
	 ('69cc1c50-7adf-4d45-b87d-499b186156c7'::uuid,'SHOPPING-JUSTINOPOLIS-001','SHOPPING JUSTINOPOLIS','','POSTO_24H','ATIVO','Avenida Severino Ballesteros Rodrigues, 850, Lojas 1004/1005 - Cabral, ','Contagem','MG','','f170a64a-560e-4d14-863d-85caedd52646'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 15:21:22.652319','2025-10-21 15:21:40.732151'),
	 ('1e8fc679-3a38-438a-8169-5e06bc0e654f'::uuid,'SICREDI-CONFINS-001','SICREDI CONFINS','','POSTO_24H','ATIVO','Rua Maria Rodrigues, 136, Loja 01 - Centro,','Confins','MG','3350000','65e59abc-db76-410f-8194-a85ad4cc22c7'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 14:23:36.43617','2025-10-21 15:21:56.131908'),
	 ('73fce14f-a950-45d9-a6c8-f289417541ac'::uuid,'MILPLAN-001','MILPLAN','','POSTO_24H','ATIVO','Avenida Mariza de Souza Mendes, 58, Sala 1 - Siderurgia','Ouro Preto','MG','36492183','ec93e79f-b966-4fb2-9526-78b9cc88eb89'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 15:39:06.491658','2025-10-21 15:39:06.491658'),
	 ('8bcaed31-a27a-48d7-91b0-d9952d734a22'::uuid,'LGA-001','LGA','','POSTO_24H','ATIVO','Rodovia MG-030, s/n - Centro','Congonhas','MG','36415000','eade6ca4-fb2b-4864-8d6e-4c91eea4308e'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 15:26:03.253865','2025-10-21 15:39:27.132511'),
	 ('ae3686cd-15e6-4315-a7de-4fc8af6b688b'::uuid,'COND-VALE-IMPERIAL-001','COND. VALE IMPERIAL','','POSTO_24H','ATIVO','Rua Francisco Deslandes, 900 - Anchieta,','Belo Horizonte','MG','30310530','c2a10090-b719-4cf0-8696-a55513a97d7c'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 15:47:49.129028','2025-10-21 15:50:03.248601'),
	 ('d9d11cb3-ebaa-4496-b48b-7cd257fd1cd2'::uuid,'BARBOSA-ME-LO-001','BARBOSA ME LO ','','POSTO_24H','ATIVO','Av. Principal, 456, Avenida Júlia Kubitschek, 1512 - Centro ','Congonhas','MG','36410084','7c5e4e3c-4fcb-4111-b0b9-71cb07cfd9e6'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 15:27:44.340186','2025-10-21 15:50:12.137975'),
	 ('b13b4d9c-936e-40ff-bc36-2f4b782cac1e'::uuid,'BIOMM-001','BIOMM','','POSTO_24H','ATIVO','Avenida Regent, 705 - Alphaville - Lagoa dos Ingleses','Nova Lima ','MG','34018000','b37c8f45-ff80-4eee-a74d-3e47bf7b6ebe'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 15:51:29.362907','2025-10-21 15:51:29.362907'),
	 ('22991dff-9772-415e-8502-a244b4448c38'::uuid,'SOLID-001','SOLID','','POSTO_24H','ATIVO','Rodovia dos Inconfidentes, s/n, km 58 - Novo Itabirito','Itabirito','MG','35456142','6a3cedeb-09bc-4d59-ab8f-ade6b84956d4'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 15:49:45.920958','2025-10-21 16:59:34.784234'),
	 ('1f37a5a1-8ce3-441f-8660-80ea27cdcc4f'::uuid,'SICREDI-RAPOSOS-001','SICREDI RAPOSOS','','POSTO_24H','ATIVO','Rua Professor Antônio Ernesto, 100','Raposos','MG','34400000','5b642694-8431-4a39-a74b-3f5fccfcf43d'::uuid,NULL,NULL,1,'12X36','08:00:00','18:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 16:00:09.889144','2025-10-21 18:17:46.88928'),
	 ('5b372b43-d9ac-4e37-9bd6-f110f4ef5485'::uuid,'SICRED-RIO-ACIMA-001','SICRED RIO ACIMA','','POSTO_24H','ATIVO','Travessa Municipal Todos, 31, Loja 06','Rio Acima','MG','3430000','5d19a2f9-316b-4d00-8ebd-6297363d524d'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 15:58:45.198577','2025-10-21 18:18:54.951688'),
	 ('3199ba06-30a7-441a-bbdd-66373352ca23'::uuid,'ANTENA-AM-FM-001','ANTENA AM / FM','','POSTO_24H','ATIVO','Rua 10','Belo Horizonte','MG','','89c2ff1a-6e1b-4c36-8c2c-e7d21d91ebbf'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 16:07:51.908655','2025-10-21 18:19:07.606124'),
	 ('ddeb8172-b975-418f-82d1-849cdeae34bb'::uuid,'ATHERPA-ESTORIL-001','ATHERPA ESTORIL','','POSTO_24H','ATIVO','Rua Wilson Rocha Lima, 137, Sala 301 - Estoril','Belo Horizonte','MG','30494460','d637b119-a0aa-4297-99a2-fc226846d25d'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 16:03:53.703831','2025-10-21 18:19:20.578574'),
	 ('75af75d7-a4c0-45d5-a277-527cf5ff6e11'::uuid,'ATHERPA-OLHOS-DAGUAS-001','ATHERPA OLHOS D''AGUAS','','POSTO_24H','ATIVO','Rua Wilson Rocha Lima, 137, Sala 301 - OLhos d''agua','Belo Horizonte','MG','30494460','d637b119-a0aa-4297-99a2-fc226846d25d'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 16:02:27.428849','2025-10-21 18:19:30.22165'),
	 ('a7d2b520-3842-4c6f-91a0-79d30f52c45f'::uuid,'CBM-BARAO-001','CBM BARÃO','','POSTO_24H','ATIVO','Rua das Flores, 123,','Barão de Cocais','MG','35970000','276c0b0c-bb1f-4107-9aa0-3b93a2e547a2'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 15:53:36.392789','2025-10-21 18:19:50.206129'),
	 ('c27e2e97-ab40-4f5e-975e-79564dca66a4'::uuid,'ECOMANING-001','ECOMANING','','POSTO_24H','ATIVO','Rodovia MG-155, s/n - Colônia Santa Isabel','Betim','MG','','10d89142-fef7-46f7-a366-4a82c3325f50'::uuid,NULL,NULL,1,'12x36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 17:05:23.523062','2025-10-21 18:20:02.505279'),
	 ('cced6773-35cc-4b58-ab1b-b553cc7370bc'::uuid,'ESTACAO-DO-CONHECIMENTO-001','ESTAÇÃO DO CONHECIMENTO','','POSTO_24H','ATIVO','Estação do Conhecimento','Brumadinho','MG','','63963541-bd1d-415c-af64-c868ff52f033'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 17:03:51.090035','2025-10-21 18:20:21.280692'),
	 ('d0ca5376-ed78-4d96-9a26-6d9fd73d898d'::uuid,'RADIO-ITATIAIA-001','RADIO ITATIAIA','','POSTO_24H','ATIVO','Avenida Barão Homem de Melo, 2222 - Estoril,','Belo Horizonte','MG','30494080','89c2ff1a-6e1b-4c36-8c2c-e7d21d91ebbf'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 16:06:12.976451','2025-10-21 18:20:51.725316'),
	 ('ff72b6ae-dc76-4c99-81ac-87c563ba393c'::uuid,'SERRA-DOS-BANDEIRA-001','SERRA DOS BANDEIRA','','POSTO_24H','ATIVO','Fazenda Bela Vista, s/n','Mario Campos','MG','32470000','63f78ae1-a955-4f61-b719-b6af0fec2a2f'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 17:01:02.27991','2025-10-21 18:21:05.605805'),
	 ('4f4d0d70-68c2-46bd-9251-cd041ce589c6'::uuid,'HARSCO-MINERAIS-LTDA-001','HARSCO MINERAIS LTDA','','POSTO_24H','ATIVO','Rodovia BR-381, s/n - Núcleo Industrial,','Timoteo','MG','35180001','4e52b832-5226-4647-a23f-60fe0877521f'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 15:56:22.828905','2025-10-21 18:17:26.207432'),
	 ('da772378-fac0-48a4-a517-9a94b4b7c61d'::uuid,'TRANSPES-MATRIZ-001','TRANSPES MATRIZ','','POSTO_24H','ATIVO','Transpes Matriz','Belo Horizonte','MG','','ddede840-e36a-4e27-8ead-884a955809ed'::uuid,NULL,NULL,1,'12X36','08:00:00','18:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 18:15:45.309479','2025-10-21 18:18:02.869321'),
	 ('d87477d6-684b-4eeb-9e75-aa0c30a85ef3'::uuid,'TRANSPES-BR381-001','TRANSPES BR381','','POSTO_24H','ATIVO','Via Expressa, s/n - Vila Cristina,','Betim','MG','32675000','ddede840-e36a-4e27-8ead-884a955809ed'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 18:12:58.758031','2025-10-21 18:18:26.210406'),
	 ('6a6a0ebe-8afa-4e5b-9764-2e0fb7b0fa0f'::uuid,'GALICIA-001','GALICIA','','POSTO_24H','ATIVO','Rua Santa Luzia, 55 - Paulo Camilo,','Betim','MG','32667594','9f3671db-c150-4ceb-a69d-2b04b8af46b8'::uuid,NULL,NULL,1,'12X36','18:00:00','08:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 18:16:55.971492','2025-10-21 18:20:38.426752'),
	 ('ec204eef-12d3-4fc6-a58a-45341a518d22'::uuid,'PONTO-LOG-001','PONTO LOG','','POSTO_24H','ATIVO','Rua Engenheiro Gerhard Ett, 1100 - Distrito Industrial','Betim','MG','32669110','fb94f83c-73e0-4277-893f-507f4be05d5f'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 18:45:26.755097','2025-10-21 18:45:26.755097'),
	 ('29472694-d401-4194-9694-2a9632294f3f'::uuid,'TRUCK-PARK-001','TRUCK PARK','','POSTO_24H','ATIVO','Rua Sucupira, 61 - Santo Antônio','Betim','MG','32684180','2a806237-9548-4dc4-b4ea-2ccfde1671c7'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 18:50:03.674088','2025-10-21 18:50:49.028952'),
	 ('ae9f3ab4-d8cb-4b49-a988-02cf62e51927'::uuid,'FIDENS-001','FIDENS','','POSTO_24H','ATIVO','Rua Min. Orozimbo Nonato, 215 - Vila da Serra','Nova Lima','MG','34000000','2fa8aa05-54ec-4bcd-b39c-480b47ae4067'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 18:53:35.614066','2025-10-21 18:53:50.228002'),
	 ('138c0fdb-71c9-495d-8af2-2b7e04885fa6'::uuid,'ODAPEL-001','ODAPEL','','POSTO_24H','ATIVO','Via Expressa Francisco Cleuton Lopes, 3115 - Água Branca, Galpão 04, Armazéns A e B,','Contagem','MG','32370485','7424e80e-b1c5-47db-b2af-fb4c4efa2215'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 18:57:27.267344','2025-10-21 18:58:32.153803'),
	 ('0e1074fc-e761-4217-b0a4-18edef98c239'::uuid,'WHARGO-001','WHARGO','','POSTO_24H','ATIVO','Rua Santa Edwiges, 300 - Santa Terezinha','Contagem','MG','32010380','1d9cd74f-00d8-4bd4-b026-d17b12e92eaa'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 18:56:00.753453','2025-10-21 18:58:46.850916'),
	 ('16137217-addf-4b92-bfb3-0ebde1dfd687'::uuid,'HOTEL-GO-INN-001','HOTEL GO INN','','POSTO_24H','ATIVO','Betim','Betim','MG','','3b5d0291-aa03-4903-8180-bb093d4fb72d'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 19:03:43.471299','2025-10-21 19:04:10.228298'),
	 ('8632b994-3c78-4f10-855d-0e23203af53f'::uuid,'REAL-LOG-01','REAL LOG 01','','POSTO_24H','ATIVO','Contagem','Contagem','MG','','5baac85a-9794-427e-81c2-815117d19b2c'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 20:13:39.521016','2025-10-21 20:13:39.521016'),
	 ('5515849c-78d3-4af3-9b75-c6a531c7fd9d'::uuid,'RC-POLO-001','RC POLO','','POSTO_24H','EM_IMPLANTACAO','Rua sem nome','Contagem','MG','','df3ab2d6-d71d-4257-92d0-a30dfb82b043'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 20:20:35.913399','2025-10-21 20:20:35.913399'),
	 ('8f0adcb3-8ea0-4d9f-b868-9037130c27fe'::uuid,'AVANTE-EASY-001','AVANTE EASY','','POSTO_24H','ATIVO','Rua sem nome','Contagem','MG','','df3ab2d6-d71d-4257-92d0-a30dfb82b043'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 20:21:34.003906','2025-10-21 20:21:34.003906'),
	 ('0573ec57-dbcb-44be-a905-d97ebe6eba1e'::uuid,'SICRED-CIDADE-NOVA-001','SICRED CIDADE NOVA','','POSTO_24H','EM_IMPLANTACAO','Rua Gonçalo Coelho, 18, Sala A - Cidade Nova','Belo Horizonte','MG','31170040','c64e8e02-46d8-4932-986c-a68203126767'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 20:27:48.789413','2025-10-21 20:27:48.789413'),
	 ('1a3eefd6-87ba-41cc-bdac-2b65f225b767'::uuid,'ARC-001','ARC','','POSTO_24H','ATIVO','Rua Henrique Diniz, 111 - Nova Cachoeirinha','Belo Horizonte','MG','1250620','6716064d-ce6f-4263-82da-f3b838eaef5b'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 20:25:48.844843','2025-10-21 20:34:15.91145'),
	 ('dc372565-4a5c-493b-83da-5c689d610357'::uuid,'LUZA-GRUP-001','LUZA GRUP','','POSTO_24H','ATIVO','- MG RUA LINO DE MORO ,25, ANDAR 5 - INCONFIDENTES ','Contagem','MG','','62c88888-7d3b-42d9-af18-6de29c173edb'::uuid,NULL,NULL,1,'12X36','18:00:00','06:00:00','18:00 A 06:00',false,false,0.00,false,false,false,false,false,0,0,0,0,false,false,false,NULL,NULL,'','2025-10-21 20:24:31.686202','2025-10-21 20:34:31.285217')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 12. LIMPEZA DE REFERÊNCIAS ÓRFÃS DE POSTOS
-- =====================================================
UPDATE employees 
SET work_post_id = NULL 
WHERE work_post_id IS NOT NULL 
  AND work_post_id NOT IN (SELECT id FROM work_posts);

-- =====================================================
-- LOG DE CONCLUSÃO FINAL
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Seed de postos de trabalho e limpeza concluída!';
END $$;






