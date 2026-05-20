-- Migration: V471__enrich_equipments_and_movements_for_type_control.sql
-- Enriquecer a tabela equipments e relacionar com postos de trabalho para controle por tipo

ALTER TABLE equipments 
    ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'COLETE',
    ADD COLUMN shots_quantity INTEGER,
    ADD COLUMN weapon_registration VARCHAR(100),
    ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN caliber VARCHAR(50),
    ADD COLUMN work_post_id UUID;

-- Adicionar Foreign Key Constraint
ALTER TABLE equipments
    ADD CONSTRAINT fk_equipment_work_post FOREIGN KEY (work_post_id) REFERENCES work_posts(id) ON DELETE SET NULL;

-- Criar Índices
CREATE INDEX idx_equipment_type ON equipments(type);
CREATE INDEX idx_equipment_work_post_id ON equipments(work_post_id);

-- Atualizar tipos dos equipamentos de exemplo existentes
UPDATE equipments SET type = 'COLETE' WHERE serial_number IN ('EQ-001-2020', 'EQ-002-2021', 'EQ-003-2019');

-- Inserir alguns dados de teste para Armas e Munições no Cofre (work_post_id IS NULL)
INSERT INTO equipments (
    status, manufacturing_date, serial_number, model, validity_date, is_dangerous, 
    type, shots_quantity, weapon_registration, quantity, caliber, work_post_id, notes
) VALUES
(
    'EM_ESTOQUE', '2022-05-10', 'ARM-T82-12345', 'Revólver Taurus .38 RT 82', '2032-05-10', true,
    'ARMA', 6, 'REG-TAURUS-82-9988', 1, '.38', NULL, 'Armamento armazenado no cofre da empresa'
),
(
    'EM_ESTOQUE', '2023-01-20', 'ARM-PT100-54321', 'Pistola Taurus .40 PT 100', '2033-01-20', true,
    'ARMA', 11, 'REG-TAURUS-100-7766', 1, '.40', NULL, 'Pistola calibre .40 armazenada no cofre da empresa'
),
(
    'EM_ESTOQUE', '2023-08-15', 'MUN-38-LOTE01', 'Munição .38 SPL CBC', '2028-08-15', true,
    'MUNICAO', NULL, NULL, 250, '.38', NULL, 'Munições calibre .38 no cofre da empresa'
),
(
    'EM_ESTOQUE', '2023-08-15', 'MUN-40-LOTE02', 'Munição .40 S&W CBC', '2028-08-15', true,
    'MUNICAO', NULL, NULL, 500, '.40', NULL, 'Munições calibre .40 no cofre da empresa'
);
