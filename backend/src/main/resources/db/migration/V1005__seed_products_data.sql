-- Seed data for products table to enable testing of the main Stock Management dashboard
-- These items are more comprehensive than the simplified stock_items

INSERT INTO products (
    id, name, description, code, barcode, category, brand, model, unit, 
    cost_price, sale_price, current_stock, minimum_stock, maximum_stock, 
    reorder_point, status, location, supplier, abc_classification
) VALUES 
-- Uniformes
('a1b2c3d4-e5f6-4a5b-8c9d-0123456789ab', 'Gandola Operacional G', 'Gandola de alta resistência rip-stop', 'UNI-GAN-G', '7891234567891', 'UNIFORME', 'Tático Pró', 'Operacional v3', 'UN', 85.50, 150.00, 25, 10, 50, 15, 'ACTIVE', 'Corredor A-1', 'Suprimentos Militares S.A.', 'A'),
('b2c3d4e5-f6a7-4b5c-9d8e-123456789abc', 'Calça Tática 42', 'Calça com 6 bolsos reforçada', 'UNI-CAL-42', '7891234567892', 'UNIFORME', 'Tático Pró', 'Elite', 'UN', 75.00, 130.00, 18, 10, 40, 12, 'ACTIVE', 'Corredor A-2', 'Suprimentos Militares S.A.', 'A'),

-- EPIs
('c3d4e5f6-a7b8-4c5d-9e8f-23456789abcd', 'Colete Balístico Nível III', 'Colete de proteção balística peso reduzido', 'EPI-COL-G', '7891234567893', 'EPI', 'ShieldGuard', 'Pro-Lite', 'UN', 1200.00, 2000.00, 5, 2, 10, 3, 'ACTIVE', 'Sala de Segurança', 'Defesa & Cia', 'A'),
('d4e5f6a7-b8c9-4d5e-9f8a-3456789abcde', 'Capacete Antitumulto', 'Capacete com viseira reforçada', 'EPI-CAP-UNI', '7891234567894', 'EPI', 'ShieldGuard', 'Riot-X', 'UN', 180.00, 320.00, 12, 5, 20, 7, 'ACTIVE', 'Corredor B-1', 'Defesa & Cia', 'B'),

-- Acessórios
('e5f6a7b8-c9d0-4e5f-9a8b-456789abcdef', 'Cinto de Guarnição', 'Cinto completo em nylon extra forte', 'ACE-CIN-UNI', '7891234567895', 'ACESSORIOS', 'BeltMaster', 'Duty-One', 'UN', 45.00, 85.00, 30, 10, 60, 15, 'ACTIVE', 'Corredor C-1', 'Acessórios Pró Ltda', 'C'),
('f6a7b8c9-d0e1-4f5a-9b8c-56789abcdef0', 'Lanterna Tática LED', 'Lanterna recarregável 1000 lumens', 'ACE-LAN-LED', '7891234567896', 'ACESSORIOS', 'NightWatch', 'Beam-1000', 'UN', 65.00, 120.00, 15, 5, 30, 8, 'ACTIVE', 'Vitrine 02', 'Eletrônicos Seguros S.A.', 'B'),

-- Itens com estoque baixo para teste
('12345678-1234-1234-1234-123456789012', 'Luva de Proteção M', 'Luva de couro tática', 'EPI-LUV-M', '7891234567897', 'EPI', 'HandSafe', 'Tactical-Touch', 'PAR', 25.00, 55.00, 2, 5, 20, 5, 'ACTIVE', 'Corredor B-2', 'Defesa & Cia', 'C'),
('23456789-2345-2345-2345-234567890123', 'Coturno de Couro 40', 'Coturno impermeável com sola antiderrapante', 'UNI-CAL-40', '7891234567898', 'CALCADOS', 'BotaForte', 'Ranger-40', 'PAR', 140.00, 260.00, 1, 5, 15, 5, 'ACTIVE', 'Corredor A-3', 'Calçados Elite S.A.', 'A');
