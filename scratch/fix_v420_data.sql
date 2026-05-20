-- Script para corrigir dados duplicados que impedem a migração V420
DO $$
DECLARE
    mapping RECORD;
BEGIN
    FOR mapping IN SELECT * FROM (VALUES 
        ('VIEW_CLIENTS', 'CLIENTS_READ'),
        ('MANAGE_CLIENTS', 'CLIENTS_WRITE'),
        ('VIEW_EMPLOYEES', 'EMPLOYEES_READ'),
        ('MANAGE_EMPLOYEES', 'EMPLOYEES_WRITE'),
        ('VIEW_CONTRACTS', 'CONTRACTS_READ'),
        ('MANAGE_CONTRACTS', 'CONTRACTS_WRITE'),
        ('VIEW_FINANCIAL', 'FINANCIAL_READ'),
        ('MANAGE_FINANCIAL', 'FINANCIAL_WRITE'),
        ('VIEW_FLEET', 'EQUIPMENTS_READ'),
        ('FLEET_READ', 'EQUIPMENTS_READ'),
        ('MANAGE_FLEET', 'EQUIPMENTS_WRITE'),
        ('FLEET_WRITE', 'EQUIPMENTS_WRITE'),
        ('VIEW_REPORTS', 'REPORTS_READ'),
        ('MANAGE_SYSTEM', 'SYSTEM_CONFIG'),
        ('SETTINGS_WRITE', 'SYSTEM_CONFIG'),
        ('VIEW_PROFILE', 'PROFILE_READ'),
        ('EDIT_PROFILE', 'PROFILE_WRITE'),
        ('VIEW_DOCUMENTS', 'DOCUMENTS_READ'),
        ('MANAGE_DOCUMENTS', 'DOCUMENTS_WRITE'),
        ('VIEW_PAYSLIP', 'PAYSLIPS_READ')
    ) as t(old_p, new_p)
    LOOP
        -- Remove registros que já possuem a nova permissão para evitar conflito de UNIQUE CONSTRAINT no UPDATE
        DELETE FROM user_group_permissions 
        WHERE permission = mapping.new_p 
        AND group_id IN (SELECT group_id FROM user_group_permissions WHERE permission = mapping.old_p);
        
        -- Agora o UPDATE pode ser feito sem erro de duplicata
        UPDATE user_group_permissions SET permission = mapping.new_p WHERE permission = mapping.old_p;
    END LOOP;
END $$;
