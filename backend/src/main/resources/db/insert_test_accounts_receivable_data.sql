-- Script para inserir dados de teste para Contas a Receber
-- Execute este script após criar as tabelas necessárias

-- Inserir clientes de teste se não existirem
INSERT INTO clients (id, name, cnpj, email, phone, mobile, address, city, state, zip_code, contact_name, contact_email, contact_phone, status, notes, created_at, updated_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Empresa ABC Ltda', '12.345.678/0001-90', 'contato@empresaabc.com', '(11) 99999-9999', '(11) 88888-8888', 'Rua das Flores, 123', 'São Paulo', 'SP', '01234-567', 'João Silva', 'joao@empresaabc.com', '(11) 99999-9999', 'ACTIVE', 'Cliente principal', NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', 'João Silva ME', '123.456.789-00', 'joao@email.com', '(11) 77777-7777', '(11) 66666-6666', 'Av. Principal, 456', 'Rio de Janeiro', 'RJ', '20000-000', 'João Silva', 'joao@email.com', '(11) 77777-7777', 'ACTIVE', 'Cliente individual', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'Tech Solutions Ltda', '98.765.432/0001-10', 'contato@techsolutions.com', '(11) 55555-5555', '(11) 44444-4444', 'Rua da Tecnologia, 789', 'São Paulo', 'SP', '04567-890', 'Maria Santos', 'maria@techsolutions.com', '(11) 55555-5555', 'ACTIVE', 'Cliente de tecnologia', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Inserir contas a receber de teste
INSERT INTO accounts_receivable (id, client_id, invoice_number, measurement_number, description, amount, amount_paid, pending_amount, issue_date, due_date, payment_date, status, category, payment_method, overdue_days, late_fee, late_penalty, notes, created_at, updated_at)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'FAT-2024-001', 'MED-2024-001', 'Serviços de consultoria - Janeiro 2024', 15000.00, 0.00, 15000.00, '2024-01-15', '2024-02-15', NULL, 'OVERDUE', 'SERVICE', 'BOLETO', 15, 150.00, 300.00, 'Cliente solicitou prazo adicional', NOW(), NOW()),
    
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'FAT-2024-002', 'MED-2024-002', 'Venda de produtos - Fevereiro 2024', 8500.00, 8500.00, 0.00, '2024-02-01', '2024-02-16', '2024-02-14', 'PAID', 'PRODUCT', 'PIX', 0, 0.00, 0.00, NULL, NOW(), NOW()),
    
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'FAT-2024-003', 'MED-2024-003', 'Manutenção de sistemas - Março 2024', 12000.00, 6000.00, 6000.00, '2024-03-01', '2024-03-31', NULL, 'PARTIAL', 'SERVICE', 'TRANSFER', 0, 0.00, 0.00, 'Pagamento parcial realizado', NOW(), NOW()),
    
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'FAT-2024-004', 'MED-2024-004', 'Desenvolvimento de software - Abril 2024', 25000.00, 0.00, 25000.00, '2024-04-01', '2024-05-01', NULL, 'PENDING', 'SERVICE', 'PIX', 0, 0.00, 0.00, 'Projeto em andamento', NOW(), NOW()),
    
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'FAT-2024-005', 'MED-2024-005', 'Consultoria técnica - Maio 2024', 8000.00, 0.00, 8000.00, '2024-05-01', '2024-05-31', NULL, 'PENDING', 'CONSULTANCY', 'BOLETO', 0, 0.00, 0.00, NULL, NOW(), NOW()),
    
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 'FAT-2024-006', 'MED-2024-006', 'Suporte técnico - Junho 2024', 5000.00, 5000.00, 0.00, '2024-06-01', '2024-06-15', '2024-06-10', 'PAID', 'SERVICE', 'PIX', 0, 0.00, 0.00, 'Pagamento antecipado', NOW(), NOW()),
    
    ('gggggggg-gggg-gggg-gggg-gggggggggggg', '33333333-3333-3333-3333-333333333333', 'FAT-2024-007', 'MED-2024-007', 'Licenças de software - Julho 2024', 12000.00, 0.00, 12000.00, '2024-07-01', '2024-07-31', NULL, 'PENDING', 'PRODUCT', 'TRANSFER', 0, 0.00, 0.00, 'Renovação anual', NOW(), NOW()),
    
    ('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '22222222-2222-2222-2222-222222222222', 'FAT-2024-008', 'MED-2024-008', 'Treinamento de equipe - Agosto 2024', 15000.00, 0.00, 15000.00, '2024-08-01', '2024-08-31', NULL, 'PENDING', 'SERVICE', 'BOLETO', 0, 0.00, 0.00, 'Treinamento presencial', NOW(), NOW()),
    
    ('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '11111111-1111-1111-1111-111111111111', 'FAT-2024-009', 'MED-2024-009', 'Auditoria de sistemas - Setembro 2024', 20000.00, 0.00, 20000.00, '2024-09-01', '2024-09-30', NULL, 'PENDING', 'SERVICE', 'PIX', 0, 0.00, 0.00, 'Auditoria trimestral', NOW(), NOW()),
    
    ('jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '33333333-3333-3333-3333-333333333333', 'FAT-2024-010', 'MED-2024-010', 'Implementação de ERP - Outubro 2024', 50000.00, 25000.00, 25000.00, '2024-10-01', '2024-10-31', NULL, 'PARTIAL', 'SERVICE', 'TRANSFER', 0, 0.00, 0.00, 'Projeto em fases', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Atualizar pending_amount para contas que têm amount_paid > 0
UPDATE accounts_receivable 
SET pending_amount = amount - amount_paid 
WHERE amount_paid > 0;

-- Atualizar overdue_days para contas vencidas
UPDATE accounts_receivable 
SET overdue_days = EXTRACT(DAY FROM (CURRENT_DATE - due_date))::INTEGER
WHERE due_date < CURRENT_DATE AND status IN ('PENDING', 'PARTIAL');

-- Atualizar status para OVERDUE para contas vencidas
UPDATE accounts_receivable 
SET status = 'OVERDUE'
WHERE due_date < CURRENT_DATE AND status = 'PENDING' AND amount_paid = 0;

-- Calcular late_fee e late_penalty para contas vencidas
UPDATE accounts_receivable 
SET late_fee = (amount * 0.01 * overdue_days),
    late_penalty = (amount * 0.02)
WHERE status = 'OVERDUE' AND overdue_days > 0;
