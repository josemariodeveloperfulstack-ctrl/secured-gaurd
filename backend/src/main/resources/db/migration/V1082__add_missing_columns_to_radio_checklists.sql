-- V1082: Adicionar colunas de assinaturas e almoxarife na tabela radio_checklists
ALTER TABLE radio_checklists ADD COLUMN IF NOT EXISTS conformity_status VARCHAR(30) DEFAULT 'CONFORME';
ALTER TABLE radio_checklists ADD COLUMN IF NOT EXISTS vigilante_signature_base64 TEXT;
ALTER TABLE radio_checklists ADD COLUMN IF NOT EXISTS almoxarife_name VARCHAR(150);
ALTER TABLE radio_checklists ADD COLUMN IF NOT EXISTS almoxarife_signature_base64 TEXT;
