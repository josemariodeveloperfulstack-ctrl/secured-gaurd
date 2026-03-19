-- Migration: V1003__fix_company_seeding_ci.sql
-- Description: Fix company seeding for CI environment with correct schema
-- Author: Antigravity

-- Corrigir a empresa de teste 'Empresa Teste CI' com os campos obrigatórios atuais
DO $$
BEGIN
    -- Se a empresa já existe (mesmo que com dados incompletos de um insert parcial), atualizar
    IF EXISTS (SELECT 1 FROM companies WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid) THEN
        UPDATE companies 
        SET 
            name = 'Empresa Teste CI',
            sigla = 'TESTCI',
            cnpj = '98.765.432/0001-10',
            email = 'empresa@teste.ci',
            phone = '(11) 2222-2222',
            address = 'Av. Empresa, 456',
            city = 'São Paulo',
            state = 'SP',
            zip_code = '01234-567',
            status = 'ACTIVE',
            updated_at = NOW()
        WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;
    ELSE
        -- Se não existe, inserir com o esquema correto
        INSERT INTO companies (
            id, name, sigla, cnpj, email, phone, address, city, state, zip_code, status, created_at, updated_at
        ) VALUES (
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
            'Empresa Teste CI',
            'TESTCI',
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
        );
    END IF;

    -- Garantir que os funcionários de teste de V999 apontem para esta empresa
    UPDATE employees 
    SET company_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
    WHERE id IN (
        'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
        'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
    );

END $$;
